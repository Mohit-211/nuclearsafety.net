import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import type { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/current-user';
import { sessionToken } from '@/lib/auth/session';
import { sha256 } from '@/lib/auth/crypto';
import { canAccessVersion } from '@/lib/services/attempts';
import { resolvePackageFile } from '@/lib/scorm/storage';
import { mimeType } from '@/lib/scorm/mime';
import { compressedFile, isCompressible, pickEncoding } from '@/lib/scorm/compress';

/*
 * Serves extracted SCORM package files to authorised users, same-origin with the
 * player (required so the content can find window.API / window.API_1484_11).
 * Supports HTTP Range requests (MP4 seeking). Filesystem paths never leave the server.
 */

export const dynamic = 'force-dynamic';

// A course page loads hundreds of assets; cache positive access checks briefly per session.
const accessCache = new Map<string, { storageKey: string; expires: number }>();
const ACCESS_TTL_MS = 60_000;

async function authorise(versionId: number): Promise<string | null> {
  const token = await sessionToken();
  if (!token) return null;
  const key = `${sha256(token)}:${versionId}`;
  const hit = accessCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.storageKey;
  const user = await getCurrentUser();
  if (!user) return null;
  const access = await canAccessVersion(user, versionId);
  if (!access) return null;
  if (accessCache.size > 5000) accessCache.clear();
  accessCache.set(key, { storageKey: access.storageKey, expires: Date.now() + ACCESS_TTL_MS });
  return access.storageKey;
}

const notFound = () => new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });

async function serve(request: NextRequest, ctx: RouteContext<'/scorm/[versionId]/[...path]'>, headOnly: boolean) {
  const { versionId: rawId, path: segments } = await ctx.params;
  const versionId = Number(rawId);
  if (!Number.isInteger(versionId) || versionId <= 0) return notFound();
  if (!segments.length || segments.some(s => !s || s === '.' || s === '..' || s.includes('\0') || s.includes('\\'))) return notFound();

  const storageKey = await authorise(versionId);
  if (!storageKey) return new Response('Forbidden', { status: 403, headers: { 'Content-Type': 'text/plain' } });

  const filePath = resolvePackageFile(storageKey, segments.join('/'));
  if (!filePath) return notFound();
  let info;
  try { info = await stat(filePath); } catch { return notFound(); }
  if (!info.isFile()) return notFound();

  const type = mimeType(filePath);
  const lastModified = info.mtime.toUTCString();
  const headers = new Headers({
    'Content-Type': type,
    'Accept-Ranges': 'bytes',
    'Last-Modified': lastModified,
    // Files under /scorm/<versionId>/ never change (a new upload is a new version id), so the
    // browser may keep them; HTML entry pages are still revalidated (cheap 304s).
    'Cache-Control': type.startsWith('text/html') ? 'private, no-cache' : 'private, max-age=2592000, immutable',
    'Vary': 'Accept-Encoding',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "frame-ancestors 'self'",
    'Referrer-Policy': 'same-origin',
  });

  const since = request.headers.get('if-modified-since');
  if (since && !Number.isNaN(Date.parse(since)) && Math.floor(info.mtimeMs / 1000) <= Math.floor(Date.parse(since) / 1000)) {
    return new Response(null, { status: 304, headers });
  }

  // Compress text assets (JS/CSS/HTML/SVG/JSON) unless a byte range was requested.
  const range = request.headers.get('range');
  const encoding = !range && isCompressible(type, info.size) ? pickEncoding(request.headers.get('accept-encoding')) : null;
  if (encoding) {
    const body = await compressedFile(filePath, info.mtimeMs, encoding);
    headers.set('Content-Encoding', encoding);
    headers.set('Content-Length', String(body.length));
    return new Response(headOnly ? null : new Uint8Array(body), { status: 200, headers });
  }

  let start = 0;
  let end = info.size - 1;
  let status = 200;
  if (range && info.size > 0) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!m || (m[1] === '' && m[2] === '')) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${info.size}` } });
    }
    if (m[1] === '') { start = Math.max(0, info.size - Number(m[2])); }
    else { start = Number(m[1]); if (m[2] !== '') end = Math.min(Number(m[2]), info.size - 1); }
    if (start > end || start >= info.size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${info.size}` } });
    status = 206;
    headers.set('Content-Range', `bytes ${start}-${end}/${info.size}`);
  }
  headers.set('Content-Length', String(info.size === 0 ? 0 : end - start + 1));

  if (headOnly || info.size === 0) return new Response(null, { status, headers });
  const stream = Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream;
  return new Response(stream, { status, headers });
}

export function GET(request: NextRequest, ctx: RouteContext<'/scorm/[versionId]/[...path]'>) {
  return serve(request, ctx, false);
}

export function HEAD(request: NextRequest, ctx: RouteContext<'/scorm/[versionId]/[...path]'>) {
  return serve(request, ctx, true);
}
