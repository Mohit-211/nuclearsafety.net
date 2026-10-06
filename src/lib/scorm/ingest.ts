import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { eq, max } from 'drizzle-orm';
import { db, schema, type Tx } from '@/db';
import { audit } from '@/lib/audit';
import { env } from '@/lib/env';
import { ManifestError, parseManifest, type PackageInfo } from './manifest';
import { extractZip, inspectZip, PackageError } from './zip';
import { ensureStorageDirs, packageDir, tmpDir } from './storage';

/*
 * "Upload ZIP and bada boom": validate → inspect → parse manifest → extract →
 * register course/version. Throws IngestError with a learner-safe message on
 * any validation failure; the caller removes the uploaded temp file.
 */

export class IngestError extends Error {}

export type IngestResult = {
  courseId: number;
  versionId: number;
  versionNumber: number;
  createdCourse: boolean;
  scormVersion: PackageInfo['scormVersion'];
  warnings: string[];
};

export async function ingestPackage(opts: {
  zipPath: string;
  zipSizeBytes: number;
  originalFilename: string | null;
  uploadedBy: number;
  /** Add a new version to this course instead of creating a course. */
  courseId?: number;
}): Promise<IngestResult> {
  const e = env();
  const limits = { maxFiles: e.SCORM_MAX_FILES, maxUncompressedBytes: e.SCORM_MAX_UNCOMPRESSED_MB * 1024 * 1024 };

  if (opts.courseId !== undefined) {
    const [course] = await db().select({ id: schema.courses.id }).from(schema.courses).where(eq(schema.courses.id, opts.courseId));
    if (!course) throw new IngestError('Course not found.');
  }

  let info: PackageInfo;
  let inspection: Awaited<ReturnType<typeof inspectZip>>;
  try {
    inspection = await inspectZip(opts.zipPath, limits);
    info = parseManifest(inspection.manifestXml, p => inspection.files.has(p));
  } catch (err) {
    if (err instanceof PackageError || err instanceof ManifestError) throw new IngestError(err.message);
    throw err;
  }
  const warnings = [...inspection.warnings, ...info.warnings];

  // Extract to a temp dir first, then move into place atomically.
  await ensureStorageDirs();
  const storageKey = randomUUID();
  const staging = path.join(tmpDir(), `extract-${storageKey}`);
  const finalDir = packageDir(storageKey);
  await mkdir(staging);
  try {
    await extractZip(opts.zipPath, staging, inspection.prefix, limits);
    await rename(staging, finalDir);
  } catch (err) {
    await rm(staging, { recursive: true, force: true });
    if (err instanceof PackageError) throw new IngestError(err.message);
    console.error('[ingest] extraction failed', err);
    throw new IngestError('The package could not be extracted.');
  }

  const launchPath = info.launchHref.replace(/^\.\//, '');
  try {
    const result = await db().transaction(async tx => {
      let courseId = opts.courseId;
      let createdCourse = false;
      if (courseId === undefined) {
        const [inserted] = await tx.insert(schema.courses).values({
          code: `tmp-${storageKey}`,
          title: (info.title ?? opts.originalFilename?.replace(/\.zip$/i, '') ?? 'Untitled course').slice(0, 255),
          status: 'draft',
          createdBy: opts.uploadedBy,
        }).$returningId();
        courseId = inserted!.id;
        createdCourse = true;
        await tx.update(schema.courses).set({ code: await uniqueCode(tx, courseId) }).where(eq(schema.courses.id, courseId));
      } else {
        // Serialise concurrent uploads to the same course.
        await tx.select({ id: schema.courses.id }).from(schema.courses).where(eq(schema.courses.id, courseId)).for('update');
      }
      const [{ current } = { current: 0 }] = await tx.select({ current: max(schema.courseVersions.versionNumber) })
        .from(schema.courseVersions).where(eq(schema.courseVersions.courseId, courseId));
      const versionNumber = (current ?? 0) + 1;
      const [version] = await tx.insert(schema.courseVersions).values({
        courseId,
        versionNumber,
        scormVersion: info.scormVersion,
        schemaVersion: info.schemaVersion?.slice(0, 60) ?? null,
        manifestIdentifier: info.identifier?.slice(0, 255) ?? null,
        manifestTitle: info.title?.slice(0, 255) ?? null,
        launchPath,
        scoCount: info.scoCount,
        manifest: info,
        storageKey,
        originalFilename: opts.originalFilename?.slice(0, 255) ?? null,
        zipSizeBytes: opts.zipSizeBytes,
        fileCount: inspection.fileCount,
        uncompressedBytes: inspection.uncompressedBytes,
        warnings,
        uploadedBy: opts.uploadedBy,
        // The first package of a new course becomes active immediately.
        ...(createdCourse ? { activatedAt: new Date(), activatedBy: opts.uploadedBy } : {}),
      }).$returningId();
      if (createdCourse) await tx.update(schema.courses).set({ activeVersionId: version!.id }).where(eq(schema.courses.id, courseId));

      if (createdCourse) await audit({ actorId: opts.uploadedBy, action: 'course.created', entityType: 'course', entityId: courseId, courseId }, tx);
      await audit({
        actorId: opts.uploadedBy, action: 'course_version.uploaded', entityType: 'course_version', entityId: version!.id, courseId,
        metadata: { versionNumber, scormVersion: info.scormVersion, schemaVersion: info.schemaVersion, filename: opts.originalFilename, warnings },
      }, tx);
      return { courseId, versionId: version!.id, versionNumber, createdCourse };
    });
    return { ...result, scormVersion: info.scormVersion, warnings };
  } catch (err) {
    await rm(finalDir, { recursive: true, force: true });
    throw err;
  }
}

/** Default course code "NS-<100+id>", falling back to a suffixed code if an admin already used it. */
async function uniqueCode(tx: Tx, courseId: number) {
  const base = `NS-${100 + courseId}`;
  for (const candidate of [base, `${base}-${randomUUID().slice(0, 4).toUpperCase()}`]) {
    const [taken] = await tx.select({ id: schema.courses.id }).from(schema.courses).where(eq(schema.courses.code, candidate)).limit(1);
    if (!taken) return candidate;
  }
  return `NS-${randomUUID().slice(0, 8).toUpperCase()}`;
}
