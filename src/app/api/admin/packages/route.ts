import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { NextRequest } from 'next/server';
import { assertPlatformAdmin, AuthError } from '@/lib/auth/current-user';
import { env } from '@/lib/env';
import { IngestError, ingestPackage } from '@/lib/scorm/ingest';
import { ensureStorageDirs, tmpDir } from '@/lib/scorm/storage';

/*
 * POST /api/admin/packages[?courseId=N]
 * Body: the raw SCORM ZIP (Content-Type: application/zip), filename in X-File-Name.
 * Without courseId a new course is created; with it, a new (inactive) version is added.
 * Streams to disk with a size cap — never buffers the whole upload in memory.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 900;

class TooLarge extends Error {}

export async function POST(request: NextRequest) {
  let user;
  try {
    ({ user } = await assertPlatformAdmin());
  } catch (err) {
    const status = err instanceof AuthError ? err.status : 403;
    return Response.json({ ok: false, error: 'You do not have permission to upload packages.' }, { status });
  }

  const courseIdParam = request.nextUrl.searchParams.get('courseId');
  const courseId = courseIdParam === null ? undefined : Number(courseIdParam);
  if (courseId !== undefined && (!Number.isInteger(courseId) || courseId <= 0)) {
    return Response.json({ ok: false, error: 'Invalid course.' }, { status: 400 });
  }

  const maxBytes = env().SCORM_MAX_UPLOAD_MB * 1024 * 1024;
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > maxBytes) return Response.json({ ok: false, error: `The file is larger than ${env().SCORM_MAX_UPLOAD_MB} MB.` }, { status: 413 });
  if (!request.body) return Response.json({ ok: false, error: 'No file was uploaded.' }, { status: 400 });

  const rawName = request.headers.get('x-file-name');
  let originalFilename: string | null = null;
  try { originalFilename = rawName ? path.basename(decodeURIComponent(rawName)).slice(0, 255) : null; } catch { /* ignore bad names */ }
  if (originalFilename && !/\.zip$/i.test(originalFilename)) {
    return Response.json({ ok: false, error: 'Upload a .zip file exported as SCORM 1.2 or SCORM 2004.' }, { status: 400 });
  }

  await ensureStorageDirs();
  const zipPath = path.join(tmpDir(), `upload-${randomUUID()}.zip`);
  let size = 0;
  try {
    const limiter = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        size += chunk.length;
        if (size > maxBytes) cb(new TooLarge());
        else cb(null, chunk);
      },
    });
    await pipeline(Readable.fromWeb(request.body as import('node:stream/web').ReadableStream), limiter, createWriteStream(zipPath));
    if (size === 0) return Response.json({ ok: false, error: 'The uploaded file is empty.' }, { status: 400 });

    const result = await ingestPackage({ zipPath, zipSizeBytes: size, originalFilename, uploadedBy: user.id, courseId });
    return Response.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof TooLarge) return Response.json({ ok: false, error: `The file is larger than ${env().SCORM_MAX_UPLOAD_MB} MB.` }, { status: 413 });
    if (err instanceof IngestError) {
      console.warn('[upload] package rejected', { file: originalFilename, reason: err.message });
      return Response.json({ ok: false, error: err.message }, { status: 422 });
    }
    console.error('[upload] failed', err);
    return Response.json({ ok: false, error: 'The package could not be processed. Please try again.' }, { status: 500 });
  } finally {
    await rm(zipPath, { force: true });
  }
}
