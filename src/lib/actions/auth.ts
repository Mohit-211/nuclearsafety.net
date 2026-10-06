'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/db';
import { audit } from '@/lib/audit';
import { dummyPasswordHash, hashPassword, passwordProblem, verifyPassword } from '@/lib/auth/crypto';
import { assertUser, loadPrincipal } from '@/lib/auth/current-user';
import { adminScopeFor } from '@/lib/auth/policy';
import { rateLimit } from '@/lib/auth/rate-limit';
import { createSession, destroyCurrentSession, destroyUserSessions } from '@/lib/auth/session';
import { findValidToken, sendPasswordLink } from '@/lib/services/password-tokens';
import { runAction, UserError, zEmail, zOptionalText, type ActionResult } from './result';

async function clientIp() {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? 'unknown';
}

const loginSchema = z.object({ email: zEmail, password: z.string().min(1, 'Enter your password.').max(200), remember: z.boolean() });

/** Returns where to go after sign-in. */
export async function login(input: z.input<typeof loginSchema>): Promise<ActionResult<{ redirectTo: string }>> {
  return runAction(async () => {
    const { email, password, remember } = loginSchema.parse(input);
    const ip = await clientIp();
    if (!rateLimit(`login:ip:${ip}`, 30, 15 * 60_000) || !rateLimit(`login:email:${email}`, 8, 15 * 60_000)) {
      throw new UserError('Too many sign-in attempts. Please wait a few minutes and try again.');
    }
    const [user] = await db().select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    const valid = user ? await verifyPassword(password, user.passwordHash) : (await verifyPassword(password, await dummyPasswordHash()), false);
    const principal = user && valid ? await loadPrincipal(user.id) : null;
    if (!principal) throw new UserError('The email or password is incorrect, or the account is inactive.');

    await createSession(principal.id, remember);
    await db().update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, principal.id));
    await audit({ actorId: principal.id, action: 'auth.login', entityType: 'session', subjectUserId: principal.id, organizationId: principal.organizationId });
    // Platform admins land in the console; everyone else (incl. corporate admins) on their dashboard.
    return { redirectTo: adminScopeFor(principal)?.kind === 'platform' ? '/admin' : '/' };
  });
}

export async function logout() {
  await destroyCurrentSession();
  redirect('/login');
}

/** Always reports success so the form cannot be used to discover accounts. */
export async function requestPasswordReset(input: { email: string }): Promise<ActionResult> {
  return runAction(async () => {
    const email = zEmail.parse(input.email);
    const ip = await clientIp();
    if (!rateLimit(`reset:ip:${ip}`, 10, 15 * 60_000) || !rateLimit(`reset:email:${email}`, 3, 15 * 60_000)) {
      throw new UserError('Too many requests. Please wait a few minutes and try again.');
    }
    const [user] = await db().select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (user && user.status === 'active') {
      try { await sendPasswordLink(user, user.passwordHash ? 'reset' : 'invite'); }
      catch (err) { console.error('[auth] reset email failed', err); }
    }
    return undefined;
  });
}

const resetSchema = z.object({ token: z.string().min(10).max(200), password: z.string(), confirm: z.string() });

export async function resetPassword(input: z.input<typeof resetSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const { token, password, confirm } = resetSchema.parse(input);
    const problem = passwordProblem(password);
    if (problem) throw new UserError(problem, { password: problem });
    if (password !== confirm) throw new UserError('The passwords do not match.', { confirm: 'The passwords do not match.' });
    const row = await findValidToken(token);
    if (!row) throw new UserError('This link is invalid or has expired. Request a new one from the sign-in page.');

    const passwordHash = await hashPassword(password);
    await db().transaction(async tx => {
      await tx.update(schema.passwordTokens).set({ usedAt: new Date() }).where(eq(schema.passwordTokens.id, row.id));
      await tx.update(schema.users).set({ passwordHash, passwordChangedAt: new Date() }).where(eq(schema.users.id, row.userId));
      await audit({ actorId: row.userId, action: 'auth.password_reset', entityType: 'user', entityId: row.userId, subjectUserId: row.userId, metadata: { purpose: row.purpose } }, tx);
    });
    await destroyUserSessions(row.userId);
    return undefined;
  });
}

const changePasswordSchema = z.object({ current: z.string().max(200), password: z.string(), confirm: z.string() });

export async function changePassword(input: z.input<typeof changePasswordSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const me = await assertUser();
    const { current, password, confirm } = changePasswordSchema.parse(input);
    if (!rateLimit(`chpw:${me.id}`, 10, 15 * 60_000)) throw new UserError('Too many attempts. Please wait a few minutes.');
    const [user] = await db().select({ passwordHash: schema.users.passwordHash }).from(schema.users).where(eq(schema.users.id, me.id));
    if (!(await verifyPassword(current, user?.passwordHash))) throw new UserError('Your current password is incorrect.', { current: 'Your current password is incorrect.' });
    const problem = passwordProblem(password);
    if (problem) throw new UserError(problem, { password: problem });
    if (password !== confirm) throw new UserError('The passwords do not match.', { confirm: 'The passwords do not match.' });

    await db().update(schema.users).set({ passwordHash: await hashPassword(password), passwordChangedAt: new Date() }).where(eq(schema.users.id, me.id));
    await audit({ actorId: me.id, action: 'auth.password_changed', entityType: 'user', entityId: me.id, subjectUserId: me.id });
    // Keep this browser signed in, sign out everywhere else.
    await destroyUserSessions(me.id);
    await createSession(me.id, false);
    return undefined;
  });
}

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(160),
  jobTitle: zOptionalText(160),
  department: zOptionalText(160),
});

/** Learners may edit their own name/job title/department. Email and organization are admin-managed. */
export async function updateOwnProfile(input: z.input<typeof profileSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const me = await assertUser();
    const values = profileSchema.parse(input);
    await db().update(schema.users).set({ name: values.name, jobTitle: values.jobTitle ?? null, department: values.department ?? null }).where(eq(schema.users.id, me.id));
    await audit({ actorId: me.id, action: 'user.updated', entityType: 'user', entityId: me.id, subjectUserId: me.id, metadata: { self: true } });
    return undefined;
  });
}
