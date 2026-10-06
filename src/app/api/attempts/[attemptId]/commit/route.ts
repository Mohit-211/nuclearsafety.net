import type { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/current-user';
import { CommitError, recordCommit } from '@/lib/services/attempts';
import { env } from '@/lib/env';

/*
 * scorm-again commit endpoint (lmsCommitUrl). Receives the full CMI tree as JSON —
 * via synchronous XHR for normal commits and navigator.sendBeacon (text/plain) for
 * the terminate commit, flagged with ?terminate=true. Responds in the format
 * scorm-again expects: { result: boolean, errorCode: number }.
 */

export const dynamic = 'force-dynamic';

/** Behind nginx the internal URL differs from the public one, so compare against Host and APP_URL. */
function isSameOrigin(origin: string, request: NextRequest) {
  try {
    const host = new URL(origin).host;
    return host === request.headers.get('host') || host === request.headers.get('x-forwarded-host') || origin === new URL(env().APP_URL).origin;
  } catch {
    return false;
  }
}

const reply = (ok: boolean, status = 200) =>
  Response.json({ result: ok, errorCode: ok ? 0 : 101 }, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: NextRequest, ctx: RouteContext<'/api/attempts/[attemptId]/commit'>) {
  const attemptId = Number((await ctx.params).attemptId);
  if (!Number.isInteger(attemptId) || attemptId <= 0) return reply(false, 404);

  // Same-origin only (beacons and XHR from our player). Blocks cross-site form posts.
  const origin = request.headers.get('origin');
  if (origin && !isSameOrigin(origin, request)) return reply(false, 403);

  const user = await getCurrentUser();
  if (!user) return reply(false, 401);

  try {
    const body = await request.text();
    await recordCommit(user, attemptId, body, request.nextUrl.searchParams.get('terminate') === 'true');
    return reply(true);
  } catch (err) {
    if (err instanceof CommitError) return reply(false, err.status);
    console.error('[scorm] commit failed', { attemptId, userId: user.id, err });
    return reply(false, 500);
  }
}
