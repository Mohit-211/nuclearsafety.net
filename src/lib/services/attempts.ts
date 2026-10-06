import 'server-only';
import { and, desc, eq, isNull, max } from 'drizzle-orm';
import { db, schema } from '@/db';
import { audit } from '@/lib/audit';
import type { Principal } from '@/lib/auth/policy';
import { buildLaunchCmi, isCourseComplete, mergeOutcome, normalizeCmi } from '@/lib/scorm/cmi';
import type { PackageInfo, ScormVersion } from '@/lib/scorm/manifest';

/*
 * SCORM attempt lifecycle: launch (create or resume an attempt pinned to a package
 * version) and commit (persist runtime state). The browser is never the source of
 * truth: everything the player shows on reload comes from these records.
 */

export type LaunchContext = {
  attemptId: number;
  versionId: number;
  scormVersion: ScormVersion;
  /** URL of the launch file, served by /scorm/[versionId]/... */
  launchUrl: string;
  initialCmi: Record<string, unknown>;
  review: boolean;
};

export class LaunchError extends Error {}

/** Encode a package-relative href (keeping its query string) for use in a URL path. */
function encodeLaunchPath(href: string) {
  const [pathPart, ...rest] = href.split('?');
  const encoded = pathPart!.split('/').map(seg => encodeURIComponent(decodeURIComponentSafe(seg))).join('/');
  return rest.length ? `${encoded}?${rest.join('?')}` : encoded;
}

function decodeURIComponentSafe(s: string) {
  try { return decodeURIComponent(s); } catch { return s; }
}

/**
 * Start or resume the learner's attempt for a course. Existing attempts stay on the
 * package version they started with; only brand-new attempts use the active version.
 */
export async function launchCourse(user: Principal, courseId: number): Promise<LaunchContext> {
  const [assignment] = await db()
    .select({ id: schema.assignments.id, courseStatus: schema.courses.status, activeVersionId: schema.courses.activeVersionId, organizationId: schema.assignments.organizationId })
    .from(schema.assignments)
    .innerJoin(schema.courses, eq(schema.courses.id, schema.assignments.courseId))
    .where(and(eq(schema.assignments.userId, user.id), eq(schema.assignments.courseId, courseId), isNull(schema.assignments.removedAt)))
    .limit(1);
  if (!assignment || assignment.courseStatus !== 'published') throw new LaunchError('This course is not in your assigned training.');

  const [latest] = await db().select().from(schema.attempts)
    .where(eq(schema.attempts.assignmentId, assignment.id))
    .orderBy(desc(schema.attempts.attemptNumber)).limit(1);

  let attempt = latest;
  if (!attempt || await attemptEnded(attempt)) {
    if (!assignment.activeVersionId) throw new LaunchError('This course has no published content yet. Please contact your training coordinator.');
    attempt = await createAttempt(user, courseId, assignment.id, assignment.activeVersionId, attempt?.attemptNumber ?? 0);
  }

  const [version] = await db().select().from(schema.courseVersions).where(eq(schema.courseVersions.id, attempt.versionId));
  if (!version) throw new LaunchError('The course content could not be found.');
  const info = version.manifest as PackageInfo;
  const item = info.items?.find(i => i.identifier === info.launchItemId);
  const review = isCourseComplete(attempt);

  return {
    attemptId: attempt.id,
    versionId: version.id,
    scormVersion: version.scormVersion,
    launchUrl: `/scorm/${version.id}/${encodeLaunchPath(version.launchPath)}`,
    initialCmi: buildLaunchCmi({
      version: version.scormVersion,
      storedCmi: attempt.cmi,
      totalTimeRaw: attempt.totalTimeRaw,
      lastExit: attempt.lastExit,
      learner: { id: user.id, name: user.name },
      item,
      review,
    }),
    review,
  };
}

/**
 * SCORM 2004: a Terminate with cmi.exit other than "suspend" ends the attempt, so the
 * next launch starts a new attempt (on the currently active version). Completed
 * attempts are kept for review; SCORM 1.2 attempts are always resumed.
 */
async function attemptEnded(attempt: typeof schema.attempts.$inferSelect): Promise<boolean> {
  if (!attempt.terminatedAt || attempt.lastExit === null || attempt.lastExit === 'suspend' || isCourseComplete(attempt)) return false;
  const [version] = await db().select({ scormVersion: schema.courseVersions.scormVersion }).from(schema.courseVersions).where(eq(schema.courseVersions.id, attempt.versionId));
  return version?.scormVersion === '2004';
}

/** Create attempt number `previous + 1`, guarded against double-creation from two tabs. */
async function createAttempt(user: Principal, courseId: number, assignmentId: number, versionId: number, previous: number) {
  return db().transaction(async tx => {
    await tx.select({ id: schema.assignments.id }).from(schema.assignments).where(eq(schema.assignments.id, assignmentId)).for('update');
    const [{ n } = { n: 0 }] = await tx.select({ n: max(schema.attempts.attemptNumber) }).from(schema.attempts).where(eq(schema.attempts.assignmentId, assignmentId));
    if ((n ?? 0) > previous) {
      const [existing] = await tx.select().from(schema.attempts).where(and(eq(schema.attempts.assignmentId, assignmentId), eq(schema.attempts.attemptNumber, n!)));
      return existing!;
    }
    const [created] = await tx.insert(schema.attempts).values({ assignmentId, userId: user.id, courseId, versionId, attemptNumber: previous + 1 }).$returningId();
    if (previous === 0) {
      await audit({ actorId: user.id, action: 'learner.course_started', entityType: 'attempt', entityId: created!.id, subjectUserId: user.id, courseId, organizationId: user.organizationId }, tx);
    }
    const [row] = await tx.select().from(schema.attempts).where(eq(schema.attempts.id, created!.id));
    return row!;
  });
}

export class CommitError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const MAX_CMI_BYTES = 4 * 1024 * 1024;

/** Persist a runtime commit from scorm-again for the signed-in learner's own attempt. */
export async function recordCommit(user: Principal, attemptId: number, rawBody: string, isTerminate: boolean) {
  if (rawBody.length > MAX_CMI_BYTES) throw new CommitError(413, 'Commit too large');
  let body: unknown;
  try { body = JSON.parse(rawBody); } catch { throw new CommitError(400, 'Invalid JSON'); }
  const cmi = (body as { cmi?: unknown })?.cmi;
  if (!cmi || typeof cmi !== 'object') throw new CommitError(400, 'Missing cmi');

  const [row] = await db()
    .select({ attempt: schema.attempts, scormVersion: schema.courseVersions.scormVersion, removedAt: schema.assignments.removedAt })
    .from(schema.attempts)
    .innerJoin(schema.courseVersions, eq(schema.courseVersions.id, schema.attempts.versionId))
    .innerJoin(schema.assignments, eq(schema.assignments.id, schema.attempts.assignmentId))
    .where(eq(schema.attempts.id, attemptId))
    .limit(1);
  // Same response for "missing" and "not yours" so attempt ids cannot be probed.
  if (!row || row.attempt.userId !== user.id) throw new CommitError(404, 'Attempt not found');
  if (row.removedAt) throw new CommitError(403, 'Assignment removed');

  const prev = row.attempt;
  const next = normalizeCmi(row.scormVersion, cmi);
  const outcome = mergeOutcome(prev, next);
  const wasComplete = isCourseComplete(prev);
  const nowComplete = isCourseComplete(outcome);
  const now = new Date();

  await db().transaction(async tx => {
    await tx.update(schema.attempts).set({
      completionStatus: outcome.completionStatus,
      successStatus: outcome.successStatus,
      // Score/progress/location reflect the latest report, but never wipe known values with blanks.
      scoreRaw: next.scoreRaw ?? prev.scoreRaw,
      scoreMin: next.scoreMin ?? prev.scoreMin,
      scoreMax: next.scoreMax ?? prev.scoreMax,
      scoreScaled: next.scoreScaled ?? prev.scoreScaled,
      progressMeasure: next.progressMeasure ?? prev.progressMeasure,
      location: next.location?.slice(0, 1000) ?? prev.location,
      // null = session still open / not cleanly terminated (treated as resumable).
      lastExit: isTerminate ? next.exit ?? '' : null,
      totalTimeRaw: next.totalTimeRaw ?? prev.totalTimeRaw,
      totalTimeSeconds: next.totalTimeSeconds !== null ? Math.round(next.totalTimeSeconds) : prev.totalTimeSeconds,
      cmi: JSON.stringify(cmi),
      commitCount: prev.commitCount + 1,
      lastCommitAt: now,
      completedAt: nowComplete && !wasComplete ? now : prev.completedAt,
      terminatedAt: isTerminate ? now : prev.terminatedAt,
    }).where(eq(schema.attempts.id, attemptId));

    const base = { actorId: user.id, entityType: 'attempt' as const, entityId: attemptId, subjectUserId: user.id, courseId: prev.courseId, organizationId: user.organizationId };
    if (nowComplete && !wasComplete) await audit({ ...base, action: 'learner.course_completed' }, tx);
    if (outcome.successStatus !== prev.successStatus && outcome.successStatus !== 'unknown') {
      await audit({ ...base, action: outcome.successStatus === 'passed' ? 'learner.course_passed' : 'learner.course_failed', metadata: { scoreRaw: next.scoreRaw, scoreScaled: next.scoreScaled } }, tx);
    }
  });

  return { completionStatus: outcome.completionStatus, successStatus: outcome.successStatus, complete: nowComplete };
}

/** Does this user have access to content of this package version? (used by the content route) */
export async function canAccessVersion(user: Principal, versionId: number): Promise<{ storageKey: string } | null> {
  const [version] = await db().select({ id: schema.courseVersions.id, courseId: schema.courseVersions.courseId, storageKey: schema.courseVersions.storageKey })
    .from(schema.courseVersions).where(eq(schema.courseVersions.id, versionId)).limit(1);
  if (!version) return null;
  // Platform admins may preview any package.
  if (user.role === 'platform_admin') return { storageKey: version.storageKey };
  // Learners: only the version of their own attempt (or the active version they will start on).
  const [attempt] = await db().select({ id: schema.attempts.id }).from(schema.attempts)
    .innerJoin(schema.assignments, eq(schema.assignments.id, schema.attempts.assignmentId))
    .where(and(eq(schema.attempts.userId, user.id), eq(schema.attempts.versionId, versionId), isNull(schema.assignments.removedAt)))
    .limit(1);
  return attempt ? { storageKey: version.storageKey } : null;
}
