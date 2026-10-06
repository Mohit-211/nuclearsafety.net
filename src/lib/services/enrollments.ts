import 'server-only';
import { and, desc, eq, inArray, isNull, type SQL } from 'drizzle-orm';
import { db, schema } from '@/db';
import { isCourseComplete, progressPercent, scorePercent } from '@/lib/scorm/cmi';
import { daysUntil, formatDate, todayISO } from '@/lib/format';
import type { AdminScope } from '@/lib/auth/policy';
import type { EnrollmentStatus, ResultStatus } from '@/lib/types';

/*
 * One loader for "assignment + learner + course + latest attempt" records, used by
 * learner pages, admin pages and reports so status/progress rules live in one place.
 */

export type EnrollmentRecord = Awaited<ReturnType<typeof loadEnrollments>>[number];

export type EnrollmentFilter = {
  userIds?: number[];
  courseIds?: number[];
  /** Restrict to current members of this organization. */
  organizationId?: number;
  /** Only courses visible to learners (published). */
  publishedOnly?: boolean;
};

/** Translate an admin scope into an enrollment filter. */
export function scopeFilter(scope: AdminScope): EnrollmentFilter {
  return scope.kind === 'organization' ? { organizationId: scope.organizationId } : {};
}

export async function loadEnrollments(filter: EnrollmentFilter) {
  const where: SQL[] = [isNull(schema.assignments.removedAt)];
  if (filter.userIds) {
    if (!filter.userIds.length) return [];
    where.push(inArray(schema.assignments.userId, filter.userIds));
  }
  if (filter.courseIds) {
    if (!filter.courseIds.length) return [];
    where.push(inArray(schema.assignments.courseId, filter.courseIds));
  }
  if (filter.organizationId !== undefined) where.push(eq(schema.organizationMembers.organizationId, filter.organizationId));
  if (filter.publishedOnly) where.push(eq(schema.courses.status, 'published'));

  const rows = await db()
    .select({
      assignmentId: schema.assignments.id,
      assignedAt: schema.assignments.assignedAt,
      dueDate: schema.assignments.dueDate,
      userId: schema.users.id,
      userName: schema.users.name,
      userEmail: schema.users.email,
      userDepartment: schema.users.department,
      userStatus: schema.users.status,
      organizationId: schema.organizationMembers.organizationId,
      organizationName: schema.organizations.name,
      courseId: schema.courses.id,
      courseCode: schema.courses.code,
      courseTitle: schema.courses.title,
      courseDescription: schema.courses.description,
      courseCategory: schema.courses.category,
      courseDuration: schema.courses.estimatedDuration,
      courseMandatory: schema.courses.isMandatory,
      courseStatus: schema.courses.status,
      activeVersionId: schema.courses.activeVersionId,
    })
    .from(schema.assignments)
    .innerJoin(schema.users, eq(schema.users.id, schema.assignments.userId))
    .innerJoin(schema.courses, eq(schema.courses.id, schema.assignments.courseId))
    .leftJoin(schema.organizationMembers, eq(schema.organizationMembers.userId, schema.users.id))
    .leftJoin(schema.organizations, eq(schema.organizations.id, schema.organizationMembers.organizationId))
    .where(and(...where))
    .orderBy(schema.users.name, schema.courses.title);

  const latest = await latestAttempts(rows.map(r => r.assignmentId));
  return rows.map(r => ({ ...r, attempt: latest.get(r.assignmentId) ?? null }));
}

/** Latest attempt (highest attempt number) for each assignment. */
export async function latestAttempts(assignmentIds: number[]) {
  const map = new Map<number, Awaited<ReturnType<typeof attemptQuery>>[number]>();
  for (let i = 0; i < assignmentIds.length; i += 1000) {
    for (const a of await attemptQuery(assignmentIds.slice(i, i + 1000))) if (!map.has(a.assignmentId)) map.set(a.assignmentId, a);
  }
  return map;
}

function attemptQuery(assignmentIds: number[]) {
  if (!assignmentIds.length) return Promise.resolve([]);
  return db()
    .select({
      id: schema.attempts.id,
      assignmentId: schema.attempts.assignmentId,
      versionId: schema.attempts.versionId,
      versionNumber: schema.courseVersions.versionNumber,
      attemptNumber: schema.attempts.attemptNumber,
      completionStatus: schema.attempts.completionStatus,
      successStatus: schema.attempts.successStatus,
      scoreRaw: schema.attempts.scoreRaw,
      scoreMin: schema.attempts.scoreMin,
      scoreMax: schema.attempts.scoreMax,
      scoreScaled: schema.attempts.scoreScaled,
      progressMeasure: schema.attempts.progressMeasure,
      commitCount: schema.attempts.commitCount,
      startedAt: schema.attempts.startedAt,
      lastCommitAt: schema.attempts.lastCommitAt,
      completedAt: schema.attempts.completedAt,
      totalTimeSeconds: schema.attempts.totalTimeSeconds,
    })
    .from(schema.attempts)
    .innerJoin(schema.courseVersions, eq(schema.courseVersions.id, schema.attempts.versionId))
    .where(inArray(schema.attempts.assignmentId, assignmentIds))
    .orderBy(desc(schema.attempts.attemptNumber));
}

export type EnrollmentSummary = {
  status: EnrollmentStatus;
  progress: number | null;
  score: number | null;
  result: ResultStatus;
  completedAt: Date | null;
  lastActivityAt: Date | null;
  overdue: boolean;
  daysUntilDue: number | null;
};

/** Derive learner-facing status from persisted attempt data (never from the browser). */
export function summarize(r: Pick<EnrollmentRecord, 'attempt' | 'dueDate'>, now = new Date()): EnrollmentSummary {
  const a = r.attempt;
  const complete = a ? isCourseComplete(a) : false;
  const started = !!a && (a.commitCount > 0 || a.completionStatus !== 'not attempted');
  const status: EnrollmentStatus = complete ? 'Completed' : started ? 'In progress' : 'Not started';
  const daysUntilDue = r.dueDate ? daysUntil(r.dueDate, now) : null;
  return {
    status,
    progress: a ? progressPercent(a) ?? (started ? null : 0) : 0,
    score: a ? scorePercent(a) : null,
    result: a?.successStatus === 'passed' ? 'Passed' : a?.successStatus === 'failed' ? 'Failed' : null,
    completedAt: complete ? a!.completedAt : null,
    lastActivityAt: a ? a.lastCommitAt ?? a.startedAt : null,
    overdue: !complete && daysUntilDue !== null && daysUntilDue < 0,
    daysUntilDue,
  };
}

/** Average of known progress values (unknown in-progress values are excluded). */
export function averageProgress(values: Array<number | null>): number {
  const known = values.filter((v): v is number => v !== null);
  return known.length ? Math.round(known.reduce((s, v) => s + v, 0) / known.length) : 0;
}

export const formatDue = (dueDate: string | null) => (dueDate ? formatDate(dueDate) : null);
export { todayISO };
