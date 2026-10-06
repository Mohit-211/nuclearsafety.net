import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { compressedFile, isCompressible, pickEncoding } from '@/lib/scorm/compress';

describe('content compression', () => {
  it('negotiates the best accepted encoding', () => {
    expect(pickEncoding('gzip, deflate, br, zstd')).toBe('br');
    expect(pickEncoding('gzip, deflate')).toBe('gzip');
    expect(pickEncoding('br;q=0, gzip;q=0.8')).toBe('gzip');
    expect(pickEncoding('identity')).toBeNull();
    expect(pickEncoding(null)).toBeNull();
  });

  it('compresses only text-like assets of a sensible size', () => {
    expect(isCompressible('text/javascript; charset=utf-8', 500_000)).toBe(true);
    expect(isCompressible('text/css; charset=utf-8', 50_000)).toBe(true);
    expect(isCompressible('image/svg+xml', 5_000)).toBe(true);
    expect(isCompressible('video/mp4', 5_000_000)).toBe(false);
    expect(isCompressible('image/jpeg', 50_000)).toBe(false);
    expect(isCompressible('font/woff2', 50_000)).toBe(false);
    expect(isCompressible('text/html; charset=utf-8', 200)).toBe(false);
  });

  it('round-trips and caches', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'compress-'));
    const file = path.join(dir, 'bundle.js');
    const source = 'function hello(){return "world";}\n'.repeat(5000);
    await writeFile(file, source);
    const br = await compressedFile(file, 1, 'br');
    const gz = await compressedFile(file, 1, 'gzip');
    expect(brotliDecompressSync(br).toString()).toBe(source);
    expect(gunzipSync(gz).toString()).toBe(source);
    expect(br.length).toBeLessThan(source.length / 10);
    expect(await compressedFile(file, 1, 'br')).toBe(br);
  });
});
