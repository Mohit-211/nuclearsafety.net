import 'server-only';
import { cookies, headers } from 'next/headers';
import { and, eq, gt, lt } from 'drizzle-orm';
import { db, schema } from '@/db';
import { env, isProduction } from '@/lib/env';
import { randomToken, sha256 } from './crypto';

/*
 * Database-backed sessions. The cookie holds a random token; the database stores
 * only its SHA-256, so a leaked sessions table cannot be replayed.
 * Cookies can only be written from Server Actions and Route Handlers.
 */

const SHORT_SESSION_HOURS = 12;

export async function createSession(userId: number, remember: boolean) {
  const token = randomToken();
  const ms = remember ? env().SESSION_REMEMBER_DAYS * 86_400_000 : SHORT_SESSION_HOURS * 3_600_000;
  const expiresAt = new Date(Date.now() + ms);
  const h = await headers();
  await db().insert(schema.sessions).values({
    id: sha256(token),
    userId,
    expiresAt,
    userAgent: h.get('user-agent')?.slice(0, 255) ?? null,
    ip: (h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null)?.slice(0, 64) ?? null,
  });
  (await cookies()).set(env().SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: 'lax',
    path: '/',
    // Without "remember me" this is a browser-session cookie (server expiry still applies).
    ...(remember ? { expires: expiresAt } : {}),
  });
  // Opportunistic cleanup of expired sessions.
  await db().delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()));
}

/** Raw session token from the request cookie, if any. */
export async function sessionToken(): Promise<string | null> {
  return (await cookies()).get(env().SESSION_COOKIE_NAME)?.value ?? null;
}

/** Resolve a session token to its (unexpired) user id. */
export async function userIdForToken(token: string): Promise<number | null> {
  const [row] = await db().select({ userId: schema.sessions.userId }).from(schema.sessions)
    .where(and(eq(schema.sessions.id, sha256(token)), gt(schema.sessions.expiresAt, new Date()))).limit(1);
  return row?.userId ?? null;
}

export async function destroyCurrentSession() {
  const store = await cookies();
  const token = store.get(env().SESSION_COOKIE_NAME)?.value;
  if (token) await db().delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
  store.delete(env().SESSION_COOKIE_NAME);
}

/** Sign a user out everywhere (password change/reset, deactivation). */
export async function destroyUserSessions(userId: number) {
  await db().delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}
