import 'server-only';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db, schema } from '@/db';
import { audit } from '@/lib/audit';
import { canAssignCourse, canManageUser, type AdminScope } from '@/lib/auth/policy';
import { UserError } from '@/lib/actions/result';
import { grantedCourseIdsByCourse } from './organizations';

/*
 * Course assignment (enrollment). Every change re-validates the policy server-side
 * using database facts — never the ids/roles the browser sent.
 */

async function learnerFacts(userIds: number[]) {
  if (!userIds.length) return new Map<number, { role: 'platform_admin' | 'learner'; organizationId: number | null; status: string }>();
  const rows = await db()
    .select({ id: schema.users.id, role: schema.users.role, status: schema.users.status, organizationId: schema.organizationMembers.organizationId })
    .from(schema.users)
    .leftJoin(schema.organizationMembers, eq(schema.organizationMembers.userId, schema.users.id))
    .where(inArray(schema.users.id, userIds));
  return new Map(rows.map(r => [r.id, { role: r.role, status: r.status, organizationId: r.organizationId ?? null }]));
}

async function courseFacts(courseIds: number[]) {
  if (!courseIds.length) return new Map<number, { title: string; status: 'draft' | 'published' | 'archived'; hasActiveVersion: boolean; grantedOrganizationIds: number[] }>();
  const rows = await db().select().from(schema.courses).where(inArray(schema.courses.id, courseIds));
  const grants = await grantedCourseIdsByCourse(courseIds);
  return new Map(rows.map(c => [c.id, { title: c.title, status: c.status, hasActiveVersion: !!c.activeVersionId, grantedOrganizationIds: grants.get(c.id) ?? [] }]));
}

export type AssignmentChange = { userId: number; courseId: number };

/**
 * Apply a batch of additions/removals atomically. Throws (and changes nothing) if
 * any requested change is not permitted for this scope.
 */
export async function applyAssignmentChanges(scope: AdminScope, actorId: number, opts: { add: AssignmentChange[]; remove: AssignmentChange[]; dueDate: string | null }) {
  const userIds = [...new Set([...opts.add, ...opts.remove].map(c => c.userId))];
  const courseIds = [...new Set([...opts.add, ...opts.remove].map(c => c.courseId))];
  const users = await learnerFacts(userIds);
  const courses = await courseFacts(courseIds);

  for (const c of opts.add) {
    const u = users.get(c.userId);
    const course = courses.get(c.courseId);
    if (!u || !course) throw new UserError('Learner or course not found.');
    if (u.status !== 'active') throw new UserError('Inactive accounts cannot be assigned courses.');
    if (!canAssignCourse(scope, course, u)) {
      throw new UserError(course.status !== 'published' || !course.hasActiveVersion
        ? `"${course.title}" must be published with an active package before it can be assigned.`
        : `You cannot assign "${course.title}" to this learner.`);
    }
  }
  for (const c of opts.remove) {
    const u = users.get(c.userId);
    if (!u || !courses.has(c.courseId) || !canManageUser(scope, u)) throw new UserError('You cannot change this enrollment.');
  }

  await db().transaction(async tx => {
    for (const c of opts.add) {
      const u = users.get(c.userId)!;
      const [existing] = await tx.select().from(schema.assignments)
        .where(and(eq(schema.assignments.userId, c.userId), eq(schema.assignments.courseId, c.courseId))).limit(1);
      if (existing && !existing.removedAt) continue;
      let assignmentId: number;
      if (existing) {
        // Re-assigning reactivates the record; earlier attempts remain attached to it.
        await tx.update(schema.assignments).set({ removedAt: null, removedBy: null, assignedAt: new Date(), assignedBy: actorId, dueDate: opts.dueDate, organizationId: u.organizationId })
          .where(eq(schema.assignments.id, existing.id));
        assignmentId = existing.id;
      } else {
        const [created] = await tx.insert(schema.assignments).values({ userId: c.userId, courseId: c.courseId, organizationId: u.organizationId, assignedBy: actorId, dueDate: opts.dueDate }).$returningId();
        assignmentId = created!.id;
      }
      await audit({ actorId, action: 'assignment.created', entityType: 'assignment', entityId: assignmentId, subjectUserId: c.userId, courseId: c.courseId, organizationId: u.organizationId, metadata: { dueDate: opts.dueDate } }, tx);
    }
    for (const c of opts.remove) {
      const [existing] = await tx.select().from(schema.assignments)
        .where(and(eq(schema.assignments.userId, c.userId), eq(schema.assignments.courseId, c.courseId), isNull(schema.assignments.removedAt))).limit(1);
      if (!existing) continue;
      await tx.update(schema.assignments).set({ removedAt: new Date(), removedBy: actorId }).where(eq(schema.assignments.id, existing.id));
      await audit({ actorId, action: 'assignment.removed', entityType: 'assignment', entityId: existing.id, subjectUserId: c.userId, courseId: c.courseId, organizationId: users.get(c.userId)?.organizationId ?? null }, tx);
    }
  });
}

export async function updateDueDate(scope: AdminScope, actorId: number, change: AssignmentChange, dueDate: string | null) {
  const u = (await learnerFacts([change.userId])).get(change.userId);
  if (!u || !canManageUser(scope, u)) throw new UserError('You cannot change this enrollment.');
  const res = await db().update(schema.assignments).set({ dueDate })
    .where(and(eq(schema.assignments.userId, change.userId), eq(schema.assignments.courseId, change.courseId), isNull(schema.assignments.removedAt)));
  if (res[0].affectedRows === 0) throw new UserError('Enrollment not found.');
  await audit({ actorId, action: 'assignment.updated', entityType: 'assignment', subjectUserId: change.userId, courseId: change.courseId, organizationId: u.organizationId, metadata: { dueDate } });
}
