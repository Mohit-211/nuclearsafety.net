import 'server-only';
import { cache } from 'react';
import { and, desc, eq, inArray, like } from 'drizzle-orm';
import { db, schema } from '@/db';
import type { PackageInfo } from '@/lib/scorm/manifest';
import { formatDate } from '@/lib/format';
import type { CertificateView, LearnerActivityItem, LearnerCourse } from '@/lib/types';
import { certificateHref, certificateKey, latestCertificates } from './certificates';
import { loadEnrollments, summarize, type EnrollmentRecord } from './enrollments';
import { retakeStatusByAssignment, type RetakeStatus } from './retakes';

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

type RetakeInfo = Awaited<ReturnType<typeof retakeStatusByAssignment>>;

/** The learner's latest certificate per course (memoised per request). */
const userCertificates = cache((userId: number) => latestCertificates({ userIds: [userId] }));

function toLearnerCourse(r: EnrollmentRecord, manifest: unknown, retakes: RetakeInfo, certificates: Awaited<ReturnType<typeof userCertificates>>): LearnerCourse {
  const s = summarize(r);
  // A request only applies to the attempt it was made for (approval opens a new attempt).
  const req = retakes.get(r.assignmentId);
  const retake: RetakeStatus = req && r.attempt && req.attemptId === r.attempt.id ? req.status : 'none';
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
    retake: retake === 'approved' ? 'none' : retake,
    retakeNote: retake === 'declined' ? req?.decisionNote ?? null : null,
    isRetake: (r.attempt?.attemptNumber ?? 1) > 1,
    certificateHref: certificates.has(certificateKey(r.userId, r.courseId)) ? certificateHref(r.courseId) : null,
  };
}

/** The signed-in learner's assigned, published courses (memoised per request). */
export const myCourses = cache(async (userId: number): Promise<LearnerCourse[]> => {
  const rows = await loadEnrollments({ userIds: [userId], publishedOnly: true });
  const manifests = await manifestsFor(rows.map(r => r.attempt?.versionId ?? r.activeVersionId).filter((v): v is number => !!v));
  const retakes = await retakeStatusByAssignment(rows.map(r => r.assignmentId));
  const certificates = await userCertificates(userId);
  return rows.map(r => toLearnerCourse(r, manifests.get(r.attempt?.versionId ?? r.activeVersionId ?? -1), retakes, certificates));
});

/** One assigned course, or null if the learner is not assigned to it (or it is not published). */
export async function myCourse(userId: number, courseId: number): Promise<LearnerCourse | null> {
  const [row] = await loadEnrollments({ userIds: [userId], courseIds: [courseId], publishedOnly: true });
  if (!row) return null;
  const versionId = row.attempt?.versionId ?? row.activeVersionId;
  const manifests = await manifestsFor(versionId ? [versionId] : []);
  return toLearnerCourse(row, versionId ? manifests.get(versionId) : null, await retakeStatusByAssignment([row.assignmentId]), await userCertificates(userId));
}

/**
 * Certificates: the latest per course, newest first. Kept even if the course was
 * later archived or the assignment removed — completion history is permanent.
 */
export async function myCertificates(userId: number): Promise<CertificateView[]> {
  return [...(await userCertificates(userId)).values()].map(c => ({
    id: c.id, courseId: c.courseId, title: c.courseTitle, number: c.number, awardedOn: formatDate(c.completedAt), href: certificateHref(c.courseId),
  }));
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
