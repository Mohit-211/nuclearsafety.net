import type { NextRequest } from 'next/server';
import { assertAdmin, AuthError } from '@/lib/auth/current-user';
import { certificateForAdmin, certificatePdfResponse } from '@/lib/services/certificates';

/** GET /api/admin/certificates/[certificateId] — a learner's certificate PDF, for admins whose scope includes the learner. */
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, ctx: RouteContext<'/api/admin/certificates/[certificateId]'>) {
  let scope;
  try {
    ({ scope } = await assertAdmin());
  } catch (err) {
    return new Response('Forbidden', { status: err instanceof AuthError ? err.status : 403 });
  }
  const id = Number((await ctx.params).certificateId);
  const certificate = Number.isInteger(id) && id > 0 ? await certificateForAdmin(scope, id) : null;
  if (!certificate) return new Response('Certificate not found', { status: 404 });
  return certificatePdfResponse(certificate);
}
