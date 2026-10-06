import 'server-only';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { env } from '@/lib/env';

/*
 * Controlled storage layout (never under /public, never exposed to the browser):
 *   STORAGE_DIR/packages/<storageKey>/...   extracted, immutable package versions
 *   STORAGE_DIR/tmp/                        in-flight uploads and extractions
 */

export function storageRoot() {
  // Runtime data directory, not source: exclude it from build output tracing.
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), env().STORAGE_DIR);
}

export function packagesDir() {
  return path.join(storageRoot(), 'packages');
}

export function tmpDir() {
  return path.join(storageRoot(), 'tmp');
}

/** Storage keys are server-generated UUIDs; validate anyway before touching the filesystem. */
export function packageDir(storageKey: string) {
  if (!/^[a-f0-9-]{36}$/.test(storageKey)) throw new Error('Invalid storage key');
  return path.join(packagesDir(), storageKey);
}

export async function ensureStorageDirs() {
  await mkdir(packagesDir(), { recursive: true });
  await mkdir(tmpDir(), { recursive: true });
}

/**
 * Resolve a package-relative path to an absolute file path inside the package
 * directory, or null if it would escape it.
 */
export function resolvePackageFile(storageKey: string, relativePath: string): string | null {
  const root = packageDir(storageKey);
  const target = path.resolve(root, relativePath);
  return target.startsWith(root + path.sep) ? target : null;
}
