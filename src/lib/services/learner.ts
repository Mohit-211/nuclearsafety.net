import 'server-only';
import { cache } from 'react';
import { and, desc, eq, inArray, like } from 'drizzle-orm';
import { db, schema } from '@/db';
import { isCourseComplete, scorePercent } from '@/lib/scorm/cmi';
import type { PackageInfo } from '@/lib/scorm/manifest';
import { formatDate } from '@/lib/format';
import type { CertificateView, LearnerActivityItem, LearnerCourse } from '@/lib/types';
import { loadEnrollments, summarize, type EnrollmentRecord } from './enrollments';

/** Module titles from a package manifest (launchable / titled items). */
export function moduleTitles(manifest: unknown): string[] {
  const info = manifest as PackageInfo | null;
  if (!info?.items) return [];
  const leaves = info.items.filter(i => i.href);
  return (leaves.length ? leaves : info.items).map(i => i.title);
}

async function manifestsFor(versionIds: number[]) {
  const ids = [...new Set(versionIds)];
  if (!ids.length) return new Map<number, unknown>();
  const rows = await db().select({ id: schema.courseVersions.id, manifest: schema.courseVersions.manifest })
    .from(schema.courseVersions).where(inArray(schema.courseVersions.id, ids));
  return new Map(rows.map(r => [r.id, r.manifest]));
}

function toLearnerCourse(r: EnrollmentRecord, manifest: unknown): LearnerCourse {
  const s = summarize(r);
  return {
    id: r.courseId,
    code: r.courseCode,
    title: r.courseTitle,
    description: r.courseDescription ?? '',
    category: r.courseCategory ?? 'Training',
    duration: r.courseDuration ?? '—',
    isMandatory: r.courseMandatory,
    due: r.dueDate ? formatDate(r.dueDate) : null,
    dueISO: r.dueDate,
    daysUntilDue: s.daysUntilDue,
    status: s.status,
    progress: s.progress,
    score: s.score,
    result: s.result,
    completedOn: s.completedAt ? formatDate(s.completedAt) : null,
    lastActivity: s.lastActivityAt ? formatDate(s.lastActivityAt) : null,
    lastActivityAt: s.lastActivityAt?.getTime() ?? null,
    modules: moduleTitles(manifest),
    // Resuming works on the attempt's own version; new attempts need an active version.
    canLaunch: !!(r.attempt?.versionId ?? r.activeVersionId),
  };
}

/** The signed-in learner's assigned, published courses (memoised per request). */
export const myCourses = cache(async (userId: number): Promise<LearnerCourse[]> => {
  const rows = await loadEnrollments({ userIds: [userId], publishedOnly: true });
  const manifests = await manifestsFor(rows.map(r => r.attempt?.versionId ?? r.activeVersionId).filter((v): v is number => !!v));
  return rows.map(r => toLearnerCourse(r, manifests.get(r.attempt?.versionId ?? r.activeVersionId ?? -1)));
});

/** One assigned course, or null if the learner is not assigned to it (or it is not published). */
export async function myCourse(userId: number, courseId: number): Promise<LearnerCourse | null> {
  const [row] = await loadEnrollments({ userIds: [userId], courseIds: [courseId], publishedOnly: true });
  if (!row) return null;
  const versionId = row.attempt?.versionId ?? row.activeVersionId;
  const manifests = await manifestsFor(versionId ? [versionId] : []);
  return toLearnerCourse(row, versionId ? manifests.get(versionId) : null);
}

/**
 * Certificates: one per course with a completed attempt. Kept even if the course
 * was later archived or the assignment removed — completion history is permanent.
 */
export async function myCertificates(user: { id: number; name: string }): Promise<CertificateView[]> {
  const rows = await db()
    .select({
      courseId: schema.courses.id, code: schema.courses.code, title: schema.courses.title,
      completionStatus: schema.attempts.completionStatus, successStatus: schema.attempts.successStatus,
      completedAt: schema.attempts.completedAt,
      scoreRaw: schema.attempts.scoreRaw, scoreMin: schema.attempts.scoreMin, scoreMax: schema.attempts.scoreMax, scoreScaled: schema.attempts.scoreScaled,
    })
    .from(schema.attempts)
    .innerJoin(schema.courses, eq(schema.courses.id, schema.attempts.courseId))
    .where(and(eq(schema.attempts.userId, user.id), eq(schema.attempts.completionStatus, 'completed')))
    .orderBy(desc(schema.attempts.completedAt));
  const seen = new Set<number>();
  const out: CertificateView[] = [];
  for (const r of rows) {
    if (seen.has(r.courseId) || !isCourseComplete(r)) continue;
    seen.add(r.courseId);
    out.push({ courseId: r.courseId, code: r.code, title: r.title, learnerName: user.name, awardedOn: formatDate(r.completedAt), score: scorePercent(r) });
  }
  return out;
}

const activityKinds: Record<string, LearnerActivityItem['kind']> = {
  'learner.course_started': 'started',
  'learner.course_completed': 'completed',
  'learner.course_passed': 'passed',
  'learner.course_failed': 'failed',
};

export async function myRecentActivity(userId: number, limit = 5): Promise<LearnerActivityItem[]> {
  const rows = await db()
    .select({ action: schema.auditEvents.action, createdAt: schema.auditEvents.createdAt, course: schema.courses.title })
    .from(schema.auditEvents)
    .innerJoin(schema.courses, eq(schema.courses.id, schema.auditEvents.courseId))
    .where(and(eq(schema.auditEvents.subjectUserId, userId), like(schema.auditEvents.action, 'learner.%')))
    .orderBy(desc(schema.auditEvents.createdAt))
    .limit(limit);
  return rows.map(r => ({ kind: activityKinds[r.action] ?? 'started', course: r.course, date: formatDate(r.createdAt) }));
}
