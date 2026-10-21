import type { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/current-user';
import { certificatePdfResponse, myCertificateForCourse } from '@/lib/services/certificates';

/** GET /api/courses/[courseId]/certificate — the signed-in learner's certificate for a course (latest completion) as a PDF. */
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, ctx: RouteContext<'/api/courses/[courseId]/certificate'>) {
  const user = await getCurrentUser();
  if (!user) return new Response('Please sign in.', { status: 401 });
  const courseId = Number((await ctx.params).courseId);
  const certificate = Number.isInteger(courseId) && courseId > 0 ? await myCertificateForCourse(user.id, courseId) : null;
  if (!certificate) return new Response('Certificate not found', { status: 404 });
  return certificatePdfResponse(certificate);
}
