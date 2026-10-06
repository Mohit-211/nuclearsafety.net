import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { brotliCompress, constants, gzip } from 'node:zlib';

/*
 * On-the-fly compression for SCORM package files. Authoring tools ship multi-MB
 * JavaScript/CSS bundles (Rise: ~5 MB before first paint) that compress ~4–5×, which
 * is the difference between ~3 s and ~12 s to open a course on an average connection.
 * Package files are immutable per version, so compressed results are cached in memory.
 */

export type Encoding = 'br' | 'gzip';

const brotli = promisify(brotliCompress);
const gz = promisify(gzip);

const COMPRESSIBLE = /^(text\/|application\/(javascript|json|xml|xhtml\+xml|xml-dtd)|image\/svg\+xml|font\/(ttf|otf)|application\/vnd\.ms-fontobject)/;
const MIN_BYTES = 1024;
/** Compressing very large files on request would stall other requests; leave them as-is. */
const MAX_BYTES = 20 * 1024 * 1024;

export function isCompressible(mime: string, size: number): boolean {
  return size >= MIN_BYTES && size <= MAX_BYTES && COMPRESSIBLE.test(mime);
}

/** Pick the best encoding the client accepts (honours q=0). */
export function pickEncoding(acceptEncoding: string | null): Encoding | null {
  if (!acceptEncoding) return null;
  const accepted = new Map<string, number>();
  for (const part of acceptEncoding.toLowerCase().split(',')) {
    const [name, ...params] = part.trim().split(';');
    const q = params.map(p => p.trim()).find(p => p.startsWith('q='));
    accepted.set(name!.trim(), q ? Number(q.slice(2)) : 1);
  }
  const ok = (e: string) => (accepted.get(e) ?? accepted.get('*') ?? 0) > 0;
  if (ok('br')) return 'br';
  if (ok('gzip')) return 'gzip';
  return null;
}

// Bounded cache of compressed files: key = path|mtime|encoding.
const CACHE_LIMIT_BYTES = 128 * 1024 * 1024;
const cache = new Map<string, Buffer>();
const pending = new Map<string, Promise<Buffer>>();
let cachedBytes = 0;

function remember(key: string, buf: Buffer) {
  cache.set(key, buf);
  cachedBytes += buf.length;
  // Evict oldest entries (Map preserves insertion order).
  for (const [k, v] of cache) {
    if (cachedBytes <= CACHE_LIMIT_BYTES) break;
    cache.delete(k);
    cachedBytes -= v.length;
  }
}

export async function compressedFile(filePath: string, mtimeMs: number, encoding: Encoding): Promise<Buffer> {
  const key = `${filePath}|${mtimeMs}|${encoding}`;
  const hit = cache.get(key);
  if (hit) {
    // Refresh recency.
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  let job = pending.get(key);
  if (!job) {
    job = (async () => {
      const raw = await readFile(filePath);
      const out = encoding === 'br'
        // Quality 5: ~gzip-9 ratio or better at a fraction of brotli-11's CPU cost.
        ? await brotli(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 5, [constants.BROTLI_PARAM_SIZE_HINT]: raw.length } })
        : await gz(raw, { level: 6 });
      remember(key, out);
      return out;
    })().finally(() => pending.delete(key));
    pending.set(key, job);
  }
  return job;
}
