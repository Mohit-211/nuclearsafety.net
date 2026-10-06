import 'server-only';
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { db, schema } from '@/db';
import { audit } from '@/lib/audit';
import { canManageCatalogue, type AdminScope } from '@/lib/auth/policy';
import { formatDate } from '@/lib/format';
import type { PackageInfo } from '@/lib/scorm/manifest';
import type { AdminCourseRow, CourseStatusLabel, EnrollmentRow } from '@/lib/types';
import { UserError } from '@/lib/actions/result';
import { averageProgress, loadEnrollments, scopeFilter, summarize } from './enrollments';
import { moduleTitles } from './learner';

export const courseStatusLabel = (s: 'draft' | 'published' | 'archived'): CourseStatusLabel =>
  s === 'published' ? 'Published' : s === 'archived' ? 'Archived' : 'Draft';

/** Course ids an organization may assign. */
export async function grantedCourseIds(organizationId: number): Promise<number[]> {
  const rows = await db().select({ courseId: schema.organizationCourses.courseId }).from(schema.organizationCourses)
    .where(eq(schema.organizationCourses.organizationId, organizationId));
  return rows.map(r => r.courseId);
}

/** Courses visible to an admin scope: everything for platform admins, granted+published for corporate admins. */
async function visibleCourses(scope: AdminScope) {
  if (scope.kind === 'platform') return db().select().from(schema.courses).orderBy(schema.courses.title);
  const ids = await grantedCourseIds(scope.organizationId);
  if (!ids.length) return [];
  return db().select().from(schema.courses)
    .where(and(inArray(schema.courses.id, ids), ne(schema.courses.status, 'draft')))
    .orderBy(schema.courses.title);
}

function stats(rows: Awaited<ReturnType<typeof loadEnrollments>>) {
  const summaries = rows.map(r => summarize(r));
  const completed = summaries.filter(s => s.status === 'Completed').length;
  const inProgress = summaries.filter(s => s.status === 'In progress').length;
  return {
    enrolled: rows.length,
    completed,
    inProgress,
    notStarted: rows.length - completed - inProgress,
    completionRate: rows.length ? Math.round((completed / rows.length) * 100) : 0,
    avgProgress: averageProgress(summaries.map(s => s.progress)),
  };
}

export async function listAdminCourses(scope: AdminScope): Promise<AdminCourseRow[]> {
  const courses = await visibleCourses(scope);
  if (!courses.length) return [];
  const enrollments = await loadEnrollments({ ...scopeFilter(scope), courseIds: courses.map(c => c.id) });
  const versionIds = courses.map(c => c.activeVersionId).filter((v): v is number => !!v);
  const versions = versionIds.length
    ? await db().select({ id: schema.courseVersions.id, scormVersion: schema.courseVersions.scormVersion, versionNumber: schema.courseVersions.versionNumber })
      .from(schema.courseVersions).where(inArray(schema.courseVersions.id, versionIds))
    : [];
  const versionById = new Map(versions.map(v => [v.id, v]));
  return courses.map(c => {
    const s = stats(enrollments.filter(e => e.courseId === c.id));
    const v = c.activeVersionId ? versionById.get(c.activeVersionId) : undefined;
    return {
      id: c.id, code: c.code, title: c.title, category: c.category ?? '—',
      enrolled: s.enrolled, inProgress: s.inProgress, completed: s.completed, completionRate: s.completionRate, avgProgress: s.avgProgress,
      status: courseStatusLabel(c.status),
      scormVersion: v ? `SCORM ${v.scormVersion}` : null,
      versionNumber: v?.versionNumber ?? null,
    };
  });
}

export type CourseVersionView = {
  id: number;
  versionNumber: number;
  scormVersion: string;
  schemaVersion: string | null;
  launchPath: string;
  scoCount: number;
  fileCount: number;
  zipSizeBytes: number;
  originalFilename: string | null;
  uploadedAt: string;
  uploadedBy: string | null;
  isActive: boolean;
  attempts: number;
  warnings: string[];
};

export async function getAdminCourse(scope: AdminScope, courseId: number) {
  const [course] = await db().select().from(schema.courses).where(eq(schema.courses.id, courseId)).limit(1);
  if (!course) return null;
  if (scope.kind === 'organization') {
    const granted = await grantedCourseIds(scope.organizationId);
    if (!granted.includes(courseId) || course.status === 'draft') return null;
  }

  const enrollments = await loadEnrollments({ ...scopeFilter(scope), courseIds: [courseId] });
  const enrollmentRows: EnrollmentRow[] = enrollments.map(e => {
    const s = summarize(e);
    return {
      userId: e.userId, learner: e.userName, email: e.userEmail, department: e.userDepartment ?? '—',
      organization: e.organizationName ?? null,
      enrolledOn: formatDate(e.assignedAt), due: e.dueDate ? formatDate(e.dueDate) : null,
      progress: s.progress, score: s.score, status: s.status,
    };
  });

  const [active] = course.activeVersionId
    ? await db().select().from(schema.courseVersions).where(eq(schema.courseVersions.id, course.activeVersionId))
    : [];

  let versions: CourseVersionView[] = [];
  let organizations: Array<{ id: number; name: string }> = [];
  if (canManageCatalogue(scope)) {
    const rows = await db()
      .select({ v: schema.courseVersions, uploader: schema.users.name })
      .from(schema.courseVersions)
      .leftJoin(schema.users, eq(schema.users.id, schema.courseVersions.uploadedBy))
      .where(eq(schema.courseVersions.courseId, courseId))
      .orderBy(desc(schema.courseVersions.versionNumber));
    const attemptCounts = await db().select({ versionId: schema.attempts.versionId }).from(schema.attempts).where(eq(schema.attempts.courseId, courseId));
    versions = rows.map(({ v, uploader }) => ({
      id: v.id, versionNumber: v.versionNumber, scormVersion: v.scormVersion, schemaVersion: v.schemaVersion,
      launchPath: v.launchPath, scoCount: v.scoCount, fileCount: v.fileCount, zipSizeBytes: v.zipSizeBytes,
      originalFilename: v.originalFilename, uploadedAt: formatDate(v.uploadedAt), uploadedBy: uploader,
      isActive: v.id === course.activeVersionId,
      attempts: attemptCounts.filter(a => a.versionId === v.id).length,
      warnings: Array.isArray(v.warnings) ? (v.warnings as string[]) : [],
    }));
    organizations = await db().select({ id: schema.organizations.id, name: schema.organizations.name })
      .from(schema.organizationCourses)
      .innerJoin(schema.organizations, eq(schema.organizations.id, schema.organizationCourses.organizationId))
      .where(eq(schema.organizationCourses.courseId, courseId))
      .orderBy(schema.organizations.name);
  }

  return {
    course: { ...course, statusLabel: courseStatusLabel(course.status) },
    activeVersion: active ? { id: active.id, versionNumber: active.versionNumber, scormVersion: active.scormVersion, modules: moduleTitles(active.manifest as PackageInfo) } : null,
    stats: stats(enrollments),
    enrollments: enrollmentRows,
    versions,
    organizations,
  };
}

export type CourseMetadataInput = {
  code: string; title: string; description: string | null; category: string | null;
  estimatedDuration: string | null; isMandatory: boolean;
};

export async function updateCourseMetadata(actorId: number, courseId: number, input: CourseMetadataInput) {
  const res = await db().update(schema.courses).set(input).where(eq(schema.courses.id, courseId));
  if (res[0].affectedRows === 0) throw new UserError('Course not found.');
  await audit({ actorId, action: 'course.updated', entityType: 'course', entityId: courseId, courseId, metadata: { ...input } });
}

export async function setCourseStatus(actorId: number, courseId: number, status: 'draft' | 'published' | 'archived') {
  const [course] = await db().select().from(schema.courses).where(eq(schema.courses.id, courseId));
  if (!course) throw new UserError('Course not found.');
  if (status === 'published' && !course.activeVersionId) throw new UserError('Upload and activate a SCORM package before publishing.');
  await db().update(schema.courses).set({ status }).where(eq(schema.courses.id, courseId));
  await audit({ actorId, action: 'course.status_changed', entityType: 'course', entityId: courseId, courseId, metadata: { from: course.status, to: status } });
}

/**
 * Make a version the one used for NEW attempts. In-flight and historical attempts
 * stay on the version they started with, so their suspend data is never applied
 * to an incompatible package.
 */
export async function activateVersion(actorId: number, courseId: number, versionId: number) {
  const [version] = await db().select().from(schema.courseVersions)
    .where(and(eq(schema.courseVersions.id, versionId), eq(schema.courseVersions.courseId, courseId)));
  if (!version) throw new UserError('Version not found for this course.');
  if (version.status !== 'ready') throw new UserError('This version is archived and cannot be activated.');
  await db().transaction(async tx => {
    const [course] = await tx.select({ activeVersionId: schema.courses.activeVersionId }).from(schema.courses).where(eq(schema.courses.id, courseId)).for('update');
    await tx.update(schema.courses).set({ activeVersionId: versionId }).where(eq(schema.courses.id, courseId));
    await tx.update(schema.courseVersions).set({ activatedAt: new Date(), activatedBy: actorId }).where(eq(schema.courseVersions.id, versionId));
    await audit({ actorId, action: 'course_version.activated', entityType: 'course_version', entityId: versionId, courseId, metadata: { previousVersionId: course?.activeVersionId ?? null, versionNumber: version.versionNumber } }, tx);
  });
}

/** Published courses with an active version that this scope may assign. */
export async function assignableCourses(scope: AdminScope) {
  const rows = await db().select({ id: schema.courses.id, code: schema.courses.code, title: schema.courses.title, category: schema.courses.category, activeVersionId: schema.courses.activeVersionId })
    .from(schema.courses).where(eq(schema.courses.status, 'published')).orderBy(schema.courses.title);
  const withVersion = rows.filter(r => r.activeVersionId);
  if (scope.kind === 'platform') return withVersion;
  const granted = new Set(await grantedCourseIds(scope.organizationId));
  return withVersion.filter(r => granted.has(r.id));
}
