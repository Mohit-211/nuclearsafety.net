import 'server-only';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db, schema } from '@/db';
import { absoluteUrl, passwordLinkEmail, sendEmail } from '@/lib/email';
import { randomToken, sha256 } from '@/lib/auth/crypto';

const TTL_HOURS = { reset: 2, invite: 72 } as const;

type Purpose = keyof typeof TTL_HOURS;

/** Create a one-time token and return the set-password link. Older unused tokens of the same purpose are invalidated. */
export async function createPasswordLink(userId: number, purpose: Purpose): Promise<string> {
  const token = randomToken();
  await db().update(schema.passwordTokens).set({ usedAt: new Date() })
    .where(and(eq(schema.passwordTokens.userId, userId), eq(schema.passwordTokens.purpose, purpose), isNull(schema.passwordTokens.usedAt)));
  await db().insert(schema.passwordTokens).values({
    id: sha256(token),
    userId,
    purpose,
    expiresAt: new Date(Date.now() + TTL_HOURS[purpose] * 3_600_000),
  });
  return absoluteUrl(`/reset-password?token=${encodeURIComponent(token)}`);
}

export async function sendPasswordLink(user: { id: number; name: string; email: string }, purpose: Purpose) {
  const link = await createPasswordLink(user.id, purpose);
  const mail = passwordLinkEmail(purpose, user.name, link, TTL_HOURS[purpose]);
  await sendEmail({ to: user.email, ...mail });
  return link;
}

/** Look up a valid (unused, unexpired) token. */
export async function findValidToken(token: string) {
  const [row] = await db().select().from(schema.passwordTokens)
    .where(and(eq(schema.passwordTokens.id, sha256(token)), isNull(schema.passwordTokens.usedAt), gt(schema.passwordTokens.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}
