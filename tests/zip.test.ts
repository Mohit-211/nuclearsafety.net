import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractZip, inspectZip, PackageError } from '@/lib/scorm/zip';
import { makeZip, manifest12 } from './fixtures';

const limits = { maxFiles: 100, maxUncompressedBytes: 10 * 1024 * 1024 };

describe('inspectZip / extractZip', () => {
  it('inspects and extracts a valid package', async () => {
    const zip = await makeZip([
      { name: 'imsmanifest.xml', content: manifest12() },
      { name: 'scormdriver/indexAPI.html', content: '<html></html>' },
      { name: 'scormcontent/index.html', content: '<html></html>' },
      { name: '__MACOSX/._junk', content: 'junk' },
    ]);
    const info = await inspectZip(zip, limits);
    expect(info.prefix).toBe('');
    expect(info.fileCount).toBe(3);
    expect(info.files.has('scormdriver/indexAPI.html')).toBe(true);
    expect(info.manifestXml).toContain('<schemaversion>1.2</schemaversion>');

    const dest = await mkdtemp(path.join(os.tmpdir(), 'scorm-out-'));
    await extractZip(zip, dest, info.prefix, limits);
    expect((await readdir(dest)).sort()).toEqual(['imsmanifest.xml', 'scormcontent', 'scormdriver']);
    expect(await readFile(path.join(dest, 'scormdriver/indexAPI.html'), 'utf8')).toBe('<html></html>');
  });

  it('accepts a single wrapping folder with a warning', async () => {
    const zip = await makeZip([
      { name: 'Course/imsmanifest.xml', content: manifest12() },
      { name: 'Course/scormdriver/indexAPI.html' },
    ]);
    const info = await inspectZip(zip, limits);
    expect(info.prefix).toBe('Course/');
    expect(info.files.has('scormdriver/indexAPI.html')).toBe(true);
    expect(info.warnings).toHaveLength(1);
  });

  it('rejects a ZIP without imsmanifest.xml', async () => {
    const zip = await makeZip([{ name: 'index.html' }]);
    await expect(inspectZip(zip, limits)).rejects.toThrow(/imsmanifest\.xml was not found/);
  });

  it('rejects files that are not ZIPs', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'scorm-bad-'));
    const file = path.join(dir, 'x.zip');
    await (await import('node:fs/promises')).writeFile(file, 'definitely not a zip');
    await expect(inspectZip(file, limits)).rejects.toThrow(PackageError);
  });

  it('rejects path traversal entries (zip slip)', async () => {
    const zip = await makeZip([{ name: 'imsmanifest.xml', content: manifest12() }, { name: 'zz/evil.txt' }]);
    // yazl refuses unsafe names, so patch "zz/" → "../" in both local and central headers.
    const fs = await import('node:fs/promises');
    const buf = await fs.readFile(zip);
    await fs.writeFile(zip, Buffer.from(buf.toString('latin1').replaceAll('zz/evil.txt', '../evil.txt'), 'latin1'));
    await expect(inspectZip(zip, limits)).rejects.toThrow(PackageError);
    const dest = await mkdtemp(path.join(os.tmpdir(), 'scorm-slip-'));
    await expect(extractZip(zip, dest, '', limits)).rejects.toThrow();
  });

  it('rejects symlinks', async () => {
    const zip = await makeZip([{ name: 'imsmanifest.xml', content: manifest12() }, { name: 'link', content: '/etc/passwd', symlink: true }]);
    await expect(inspectZip(zip, limits)).rejects.toThrow(/symbolic link/);
  });

  it('enforces file-count and size limits (zip bomb guard)', async () => {
    const zip = await makeZip([{ name: 'imsmanifest.xml', content: manifest12() }, { name: 'big.bin', content: 'a'.repeat(5000) }]);
    await expect(inspectZip(zip, { maxFiles: 1, maxUncompressedBytes: 1e9 })).rejects.toThrow(/more than 1 files/);
    await expect(inspectZip(zip, { maxFiles: 100, maxUncompressedBytes: 1000 })).rejects.toThrow(/expands to more than/);
  });
});
