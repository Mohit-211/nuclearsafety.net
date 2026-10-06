import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import yauzl, { type Entry, type ZipFile } from 'yauzl';
import { safeRelativePath } from './manifest';

/*
 * Safe ZIP inspection and extraction. ZIPs are untrusted: we reject absolute
 * paths, "..", symlinks, encrypted entries, excessive file counts and excessive
 * uncompressed size (zip bombs), and every extracted path is re-checked to stay
 * inside the destination directory.
 */

export class PackageError extends Error {}

export type ZipLimits = { maxFiles: number; maxUncompressedBytes: number };

export type ZipInspection = {
  /** Package-relative paths of all files (prefix stripped). */
  files: Set<string>;
  /** Folder prefix wrapping the package ("" when imsmanifest.xml is at the root). */
  prefix: string;
  manifestXml: string;
  fileCount: number;
  uncompressedBytes: number;
  warnings: string[];
};

const MAX_MANIFEST_BYTES = 5 * 1024 * 1024;

function openZip(file: string): Promise<ZipFile> {
  return new Promise((resolve, reject) =>
    yauzl.open(file, { lazyEntries: true, autoClose: false, validateEntrySizes: true, strictFileNames: false, decodeStrings: true },
      (err, zip) => (err || !zip ? reject(new PackageError('The file is not a valid ZIP archive.')) : resolve(zip))));
}

function openStream(zip: ZipFile, entry: Entry): Promise<NodeJS.ReadableStream> {
  return new Promise((resolve, reject) => zip.openReadStream(entry, (err, stream) => (err || !stream ? reject(err ?? new Error('no stream')) : resolve(stream))));
}

/** Iterate entries sequentially. */
async function forEachEntry(zip: ZipFile, fn: (entry: Entry) => Promise<void>) {
  await new Promise<void>((resolve, reject) => {
    zip.on('entry', (entry: Entry) => { fn(entry).then(() => zip.readEntry(), reject); });
    zip.on('end', () => resolve());
    zip.on('error', err => reject(err instanceof PackageError ? err : new PackageError(`The ZIP archive is corrupt (${(err as Error).message}).`)));
    zip.readEntry();
  });
}

const isDirectory = (e: Entry) => e.fileName.endsWith('/');
const isSymlink = (e: Entry) => ((e.externalFileAttributes >>> 16) & 0o170000) === 0o120000;
const isEncrypted = (e: Entry) => (e.generalPurposeBitFlag & 0x1) !== 0;
/** OS junk that should never be extracted. */
const isJunk = (name: string) => name.startsWith('__MACOSX/') || /(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini)$/i.test(name);

export async function inspectZip(file: string, limits: ZipLimits): Promise<ZipInspection> {
  const zip = await openZip(file);
  try {
    const names: string[] = [];
    let total = 0;
    await forEachEntry(zip, async entry => {
      const name = entry.fileName.replace(/\\/g, '/');
      if (isDirectory(entry) || isJunk(name)) return;
      if (isSymlink(entry)) throw new PackageError(`The ZIP contains a symbolic link ("${name}"), which is not allowed.`);
      if (isEncrypted(entry)) throw new PackageError('The ZIP contains encrypted (password-protected) files.');
      if (safeRelativePath(encodeURI(name)) === null) throw new PackageError(`The ZIP contains an unsafe path ("${name}").`);
      names.push(name);
      if (names.length > limits.maxFiles) throw new PackageError(`The package has more than ${limits.maxFiles} files.`);
      total += entry.uncompressedSize;
      if (total > limits.maxUncompressedBytes) throw new PackageError(`The package expands to more than ${Math.round(limits.maxUncompressedBytes / 1048576)} MB.`);
    });

    const warnings: string[] = [];
    let prefix = '';
    if (!names.includes('imsmanifest.xml')) {
      const nested = names.filter(n => /^[^/]+\/imsmanifest\.xml$/.test(n));
      const candidate = nested.length === 1 ? nested[0]!.slice(0, -'imsmanifest.xml'.length) : null;
      if (candidate && names.every(n => n.startsWith(candidate))) {
        prefix = candidate;
        warnings.push(`imsmanifest.xml was inside the "${candidate.slice(0, -1)}" folder rather than the ZIP root; that folder was used as the package root.`);
      } else {
        throw new PackageError('imsmanifest.xml was not found at the root of the ZIP. Zip the contents of the course folder, not the folder itself.');
      }
    }

    const files = new Set(names.map(n => n.slice(prefix.length)));
    const manifestXml = await readEntryText(file, `${prefix}imsmanifest.xml`);
    return { files, prefix, manifestXml, fileCount: names.length, uncompressedBytes: total, warnings };
  } finally {
    zip.close();
  }
}

async function readEntryText(file: string, wanted: string): Promise<string> {
  const zip = await openZip(file);
  try {
    let out: string | null = null;
    await forEachEntry(zip, async entry => {
      if (out !== null || entry.fileName.replace(/\\/g, '/') !== wanted) return;
      if (entry.uncompressedSize > MAX_MANIFEST_BYTES) throw new PackageError('imsmanifest.xml is unreasonably large.');
      const chunks: Buffer[] = [];
      for await (const chunk of await openStream(zip, entry)) chunks.push(chunk as Buffer);
      out = Buffer.concat(chunks).toString('utf8').replace(/^﻿/, '');
    });
    if (out === null) throw new PackageError('imsmanifest.xml could not be read.');
    return out;
  } finally {
    zip.close();
  }
}

/** Extract all (non-junk) files below `prefix` into `destDir`, which must already exist and be empty. */
export async function extractZip(file: string, destDir: string, prefix: string, limits: ZipLimits) {
  const root = path.resolve(destDir);
  const zip = await openZip(file);
  let written = 0;
  try {
    await forEachEntry(zip, async entry => {
      const name = entry.fileName.replace(/\\/g, '/');
      if (isDirectory(entry) || isJunk(name) || !name.startsWith(prefix)) return;
      if (isSymlink(entry) || isEncrypted(entry)) throw new PackageError(`Refusing to extract "${name}".`);
      const rel = name.slice(prefix.length);
      const target = path.resolve(root, rel);
      if (!target.startsWith(root + path.sep)) throw new PackageError(`The ZIP contains an unsafe path ("${name}").`);
      await mkdir(path.dirname(target), { recursive: true });
      // Count real bytes as they stream (headers can lie about sizes).
      const counter = new Transform({
        transform(chunk: Buffer, _enc, cb) {
          written += chunk.length;
          if (written > limits.maxUncompressedBytes) cb(new PackageError('The package expands beyond the allowed size.'));
          else cb(null, chunk);
        },
      });
      await pipeline(await openStream(zip, entry), counter, createWriteStream(target, { flags: 'wx' }));
    });
  } finally {
    zip.close();
  }
}
