import 'server-only';
import { and, desc, eq, inArray, isNull, max } from 'drizzle-orm';
import { db, schema } from '@/db';
import { audit } from '@/lib/audit';
import { UserError } from '@/lib/actions/result';
import { canManageUser, type AdminScope, type Principal } from '@/lib/auth/policy';
import { sendEmail, absoluteUrl } from '@/lib/email';
import { isCourseComplete } from '@/lib/scorm/cmi';
import { formatDate } from '@/lib/format';

/*
 * Retake requests. A learner who completed a course may ask to take it again; until an
 * admin (platform admin, or the corporate admin of the learner's organization) approves,
 * the learner can only review the completed attempt. Approval creates a new attempt on
 * the course's active version. Earlier attempts, completions and certificates are kept.
 */

export type RetakeStatus = 'none' | 'pending' | 'declined' | 'approved';

/** Latest retake request status per assignment (for learner-facing views). */
export async function retakeStatusByAssignment(assignmentIds: number[]) {
  const map = new Map<number, { status: RetakeStatus; attemptId: number; decisionNote: string | null }>();
  if (!assignmentIds.length) return map;
  const rows = await db().select().from(schema.retakeRequests)
    .where(inArray(schema.retakeRequests.assignmentId, assignmentIds))
    .orderBy(desc(schema.retakeRequests.requestedAt), desc(schema.retakeRequests.id));
  for (const r of rows) if (!map.has(r.assignmentId)) map.set(r.assignmentId, { status: r.status, attemptId: r.attemptId, decisionNote: r.decisionNote });
  return map;
}

export async function requestRetake(user: Principal, courseId: number, reason: string | null) {
  return db().transaction(async tx => {
    const [assignment] = await tx.select().from(schema.assignments)
      .where(and(eq(schema.assignments.userId, user.id), eq(schema.assignments.courseId, courseId), isNull(schema.assignments.removedAt)))
      .for('update');
    if (!assignment) throw new UserError('This course is not in your assigned training.');
    const [latest] = await tx.select().from(schema.attempts).where(eq(schema.attempts.assignmentId, assignment.id))
      .orderBy(desc(schema.attempts.attemptNumber)).limit(1);
    if (!latest || !isCourseComplete(latest)) throw new UserError('You can request a retake after completing the course.');
    const [pending] = await tx.select({ id: schema.retakeRequests.id }).from(schema.retakeRequests)
      .where(and(eq(schema.retakeRequests.assignmentId, assignment.id), eq(schema.retakeRequests.status, 'pending')));
    if (pending) throw new UserError('You have already requested a retake. Your administrator will review it.');

    const [created] = await tx.insert(schema.retakeRequests).values({
      assignmentId: assignment.id, userId: user.id, courseId, attemptId: latest.id, reason,
    }).$returningId();
    await audit({ actorId: user.id, action: 'retake.requested', entityType: 'retake_request', entityId: created!.id, subjectUserId: user.id, courseId, organizationId: user.organizationId, metadata: { reason } }, tx);
    return created!.id;
  });
}

export type RetakeRequestRow = {
  id: number; userId: number; learner: string; email: string; organization: string | null;
  courseId: number; course: string; courseCode: string; reason: string | null; requestedOn: string;
};

/** Pending requests visible to an admin scope (corporate admins: own members only). */
export async function pendingRetakes(scope: AdminScope, opts: { userId?: number } = {}): Promise<RetakeRequestRow[]> {
  const where = [eq(schema.retakeRequests.status, 'pending')];
  if (opts.userId) where.push(eq(schema.retakeRequests.userId, opts.userId));
  if (scope.kind === 'organization') where.push(eq(schema.organizationMembers.organizationId, scope.organizationId));
  const rows = await db()
    .select({
      id: schema.retakeRequests.id, userId: schema.users.id, learner: schema.users.name, email: schema.users.email,
      organization: schema.organizations.name, courseId: schema.courses.id, course: schema.courses.title, courseCode: schema.courses.code,
      reason: schema.retakeRequests.reason, requestedAt: schema.retakeRequests.requestedAt,
    })
    .from(schema.retakeRequests)
    .innerJoin(schema.users, eq(schema.users.id, schema.retakeRequests.userId))
    .innerJoin(schema.courses, eq(schema.courses.id, schema.retakeRequests.courseId))
    .leftJoin(schema.organizationMembers, eq(schema.organizationMembers.userId, schema.users.id))
    .leftJoin(schema.organizations, eq(schema.organizations.id, schema.organizationMembers.organizationId))
    .where(and(...where))
    .orderBy(schema.retakeRequests.requestedAt);
  return rows.map(r => ({ ...r, organization: r.organization ?? null, requestedOn: formatDate(r.requestedAt) }));
}

/** Approve or decline a pending request. Approval opens a new attempt on the active version. */
export async function decideRetake(scope: AdminScope, actorId: number, requestId: number, approve: boolean, note: string | null) {
  const result = await db().transaction(async tx => {
    const [row] = await tx
      .select({
        request: schema.retakeRequests,
        role: schema.users.role, email: schema.users.email, name: schema.users.name,
        organizationId: schema.organizationMembers.organizationId,
        courseTitle: schema.courses.title, courseStatus: schema.courses.status, activeVersionId: schema.courses.activeVersionId,
        removedAt: schema.assignments.removedAt,
      })
      .from(schema.retakeRequests)
      .innerJoin(schema.users, eq(schema.users.id, schema.retakeRequests.userId))
      .innerJoin(schema.courses, eq(schema.courses.id, schema.retakeRequests.courseId))
      .innerJoin(schema.assignments, eq(schema.assignments.id, schema.retakeRequests.assignmentId))
      .leftJoin(schema.organizationMembers, eq(schema.organizationMembers.userId, schema.users.id))
      .where(eq(schema.retakeRequests.id, requestId))
      .for('update');
    if (!row || !canManageUser(scope, { role: row.role, organizationId: row.organizationId ?? null })) throw new UserError('Retake request not found.');
    if (row.request.status !== 'pending') throw new UserError('This request has already been decided.');

    let newAttemptId: number | null = null;
    if (approve) {
      if (row.removedAt) throw new UserError('The learner is no longer assigned to this course.');
      if (row.courseStatus !== 'published' || !row.activeVersionId) throw new UserError('The course must be published with an active package to approve a retake.');
      const assignmentId = row.request.assignmentId;
      await tx.select({ id: schema.assignments.id }).from(schema.assignments).where(eq(schema.assignments.id, assignmentId)).for('update');
      const [{ n } = { n: 0 }] = await tx.select({ n: max(schema.attempts.attemptNumber) }).from(schema.attempts).where(eq(schema.attempts.assignmentId, assignmentId));
      const [created] = await tx.insert(schema.attempts).values({
        assignmentId, userId: row.request.userId, courseId: row.request.courseId, versionId: row.activeVersionId, attemptNumber: (n ?? 0) + 1,
      }).$returningId();
      newAttemptId = created!.id;
    }
    await tx.update(schema.retakeRequests).set({
      status: approve ? 'approved' : 'declined', decidedBy: actorId, decidedAt: new Date(), decisionNote: note, newAttemptId,
    }).where(eq(schema.retakeRequests.id, requestId));
    await audit({
      actorId, action: approve ? 'retake.approved' : 'retake.declined', entityType: 'retake_request', entityId: requestId,
      subjectUserId: row.request.userId, courseId: row.request.courseId, organizationId: row.organizationId ?? null, metadata: { note, newAttemptId },
    }, tx);
    return row;
  });

  try {
    await sendEmail({
      to: result.email,
      subject: approve ? `Retake approved: ${result.courseTitle}` : `Retake request declined: ${result.courseTitle}`,
      text: approve
        ? `Hello ${result.name},\n\nYour request to retake "${result.courseTitle}" has been approved. Open the course to start again:\n\n${absoluteUrl(`/courses/${result.request.courseId}`)}\n\nYour earlier completion and certificate remain on record.\n${note ? `\nNote from your administrator: ${note}\n` : ''}`
        : `Hello ${result.name},\n\nYour request to retake "${result.courseTitle}" was not approved.${note ? `\n\nNote from your administrator: ${note}` : ''}\n\nYou can still review the course at any time.\n`,
    });
  } catch (err) {
    console.error('[retake] notification email failed', err);
  }
}
