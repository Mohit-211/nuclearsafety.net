import { describe, expect, it } from 'vitest';
import { applyParameters, joinHref, ManifestError, parseManifest, safeRelativePath } from '@/lib/scorm/manifest';
import { manifest12, manifest2004 } from './fixtures';

const all = () => true;

describe('parseManifest', () => {
  it('detects SCORM 1.2 and the launch SCO (Rise/scormdriver layout)', () => {
    const info = parseManifest(manifest12({ mastery: '80' }), all);
    expect(info.scormVersion).toBe('1.2');
    expect(info.schemaVersion).toBe('1.2');
    expect(info.launchHref).toBe('scormdriver/indexAPI.html');
    expect(info.title).toBe('Nuclear Safety Fundamentals');
    expect(info.scoCount).toBe(1);
    expect(info.items[0]?.masteryScore).toBe('80');
    expect(info.warnings).toEqual([]);
  });

  it('detects SCORM 2004, applies xml:base and item parameters', () => {
    const info = parseManifest(manifest2004, p => p === 'content/index.html');
    expect(info.scormVersion).toBe('2004');
    expect(info.launchHref).toBe('content/index.html?mode=full');
    expect(info.items[0]?.completionThreshold).toBe('0.8');
  });

  it('rejects a manifest whose launch file is missing from the ZIP', () => {
    expect(() => parseManifest(manifest12(), () => false)).toThrow(/missing from the ZIP/);
  });

  it('rejects launch paths that escape the package', () => {
    expect(() => parseManifest(manifest12({ href: '../../etc/passwd' }), all)).toThrow(ManifestError);
    expect(() => parseManifest(manifest12({ href: 'https://evil.example/x.html' }), all)).toThrow(ManifestError);
  });

  it('rejects non-SCORM XML and broken XML', () => {
    expect(() => parseManifest('<manifest><resources><resource identifier="a" href="a.html"/></resources></manifest>', all)).toThrow(/SCORM version/);
    expect(() => parseManifest('<not-xml', all)).toThrow(ManifestError);
    expect(() => parseManifest('<foo/>', all)).toThrow(/no <manifest>/);
  });

  it('warns about multi-SCO packages and launches the first SCO', () => {
    const extra = '<item identifier="ITEM-2" identifierref="RES-1"><title>Lesson 2</title></item>';
    const info = parseManifest(manifest12({ extraItems: extra }), all);
    expect(info.scoCount).toBe(2);
    expect(info.launchItemId).toBe('ITEM-1');
    expect(info.warnings.join(' ')).toMatch(/2 SCOs/);
  });
});

describe('path helpers', () => {
  it('safeRelativePath normalises and rejects traversal', () => {
    expect(safeRelativePath('a/./b/c.html?x=1#y')).toBe('a/b/c.html');
    expect(safeRelativePath('a%20b/c.html')).toBe('a b/c.html');
    expect(safeRelativePath('../x')).toBeNull();
    expect(safeRelativePath('a/../../x')).toBeNull();
    expect(safeRelativePath('/abs')).toBeNull();
    expect(safeRelativePath('javascript:alert(1)')).toBeNull();
  });

  it('joinHref and applyParameters follow IMS CP rules', () => {
    expect(joinHref('base/', null, 'sub', 'index.html')).toBe('base/sub/index.html');
    expect(applyParameters('index.html', '?a=1')).toBe('index.html?a=1');
    expect(applyParameters('index.html?x=1', '?a=1')).toBe('index.html?x=1&a=1');
    expect(applyParameters('index.html', '#frag')).toBe('index.html#frag');
  });
});
