import { XMLParser } from 'fast-xml-parser';

/*
 * imsmanifest.xml parsing for SCORM 1.2 and SCORM 2004 (pure — no I/O).
 * Produces a compact PackageInfo that is stored with each course version.
 */

export type ScormVersion = '1.2' | '2004';

export type PackageItem = {
  identifier: string;
  title: string;
  depth: number;
  /** Resolved launch href for SCO/asset items (relative to the package root, may include a query). */
  href: string | null;
  scormType: 'sco' | 'asset' | null;
  /** Per-item runtime initialisation data from the manifest. */
  masteryScore?: string;
  dataFromLms?: string;
  completionThreshold?: string;
};

export type PackageInfo = {
  scormVersion: ScormVersion;
  schemaVersion: string | null;
  identifier: string | null;
  title: string | null;
  organization: { identifier: string; title: string } | null;
  items: PackageItem[];
  /** The item launched by the player (first launchable item of the default organization). */
  launchItemId: string;
  launchHref: string;
  scoCount: number;
  warnings: string[];
};

export class ManifestError extends Error {}

type Node = Record<string, unknown>;

const ARRAY_TAGS = new Set(['organization', 'item', 'resource', 'file', 'dependency']);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  removeNSPrefix: true,
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
  isArray: name => ARRAY_TAGS.has(name),
  processEntities: true,
  htmlEntities: false,
});

const asArray = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

function text(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string' || typeof v === 'number') return String(v).trim() || null;
  if (typeof v === 'object' && '#text' in (v as Node)) return text((v as Node)['#text']);
  return null;
}

/** Case-insensitive attribute lookup (manifests in the wild mix `scormtype`/`scormType`). */
function attr(node: Node | undefined, name: string): string | null {
  if (!node) return null;
  const want = `@${name}`.toLowerCase();
  for (const key of Object.keys(node)) if (key.toLowerCase() === want) return text(node[key]);
  return null;
}

function child(node: Node | undefined, name: string): unknown {
  if (!node) return undefined;
  const want = name.toLowerCase();
  for (const key of Object.keys(node)) if (key.toLowerCase() === want) return node[key];
  return undefined;
}

/** Join xml:base fragments and an href per IMS CP (relative bases only). */
export function joinHref(...parts: Array<string | null | undefined>): string {
  let out = '';
  for (const raw of parts) {
    if (!raw) continue;
    const part = raw.replace(/\\/g, '/');
    if (/^[a-z][a-z0-9+.-]*:/i.test(part) || part.startsWith('/')) { out = part; continue; }
    out = out && !out.endsWith('/') ? `${out}/${part}` : `${out}${part}`;
  }
  return out;
}

/** Append item `parameters` to a launch href (IMS CP rules). */
export function applyParameters(href: string, parameters: string | null): string {
  if (!parameters) return href;
  let p = parameters.trim();
  if (!p) return href;
  if (p.startsWith('#')) return href.includes('#') ? href : href + p;
  if (p.startsWith('?')) p = p.slice(1);
  return href + (href.includes('?') ? '&' : '?') + p;
}

/**
 * Normalise a package-relative path: decode, strip query/fragment, collapse "." and
 * reject anything absolute, external or escaping the package root. Returns null if unsafe.
 */
export function safeRelativePath(href: string): string | null {
  const noQuery = href.split(/[?#]/)[0] ?? '';
  let decoded: string;
  try { decoded = decodeURIComponent(noQuery); } catch { return null; }
  if (!decoded || /^[a-z][a-z0-9+.-]*:/i.test(decoded) || decoded.startsWith('/') || decoded.includes('\0')) return null;
  const out: string[] = [];
  for (const seg of decoded.replace(/\\/g, '/').split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') return null;
    out.push(seg);
  }
  return out.length ? out.join('/') : null;
}

function detectVersion(manifest: Node, schemaVersion: string | null, rawXml: string): ScormVersion {
  const sv = (schemaVersion ?? '').toLowerCase();
  if (sv === '1.2') return '1.2';
  if (sv.includes('2004') || sv.includes('cam 1.3') || sv === '1.3') return '2004';
  // Fall back to namespaces declared in the document.
  if (/adlcp_v1p3|adlseq_v1p3|imsss/i.test(rawXml)) return '2004';
  if (/adlcp_rootv1p2/i.test(rawXml)) return '1.2';
  void manifest;
  throw new ManifestError('Could not determine the SCORM version: the manifest has no recognisable <schemaversion> or SCORM namespace. Only SCORM 1.2 and SCORM 2004 packages are supported.');
}

/** Parse an imsmanifest.xml document. `fileExists` checks a package-relative path. */
export function parseManifest(xml: string, fileExists: (path: string) => boolean): PackageInfo {
  let doc: Node;
  try {
    doc = parser.parse(xml) as Node;
  } catch (err) {
    throw new ManifestError(`imsmanifest.xml is not valid XML (${(err as Error).message}).`);
  }
  const manifest = child(doc, 'manifest') as Node | undefined;
  if (!manifest || typeof manifest !== 'object') throw new ManifestError('imsmanifest.xml has no <manifest> root element.');

  const warnings: string[] = [];
  const metadata = child(manifest, 'metadata') as Node | undefined;
  const schemaVersion = text(child(metadata, 'schemaversion'));
  const scormVersion = detectVersion(manifest, schemaVersion, xml);

  const manifestBase = attr(manifest, 'base');
  const resourcesNode = child(manifest, 'resources') as Node | undefined;
  const resourcesBase = attr(resourcesNode, 'base');
  const resources = new Map<string, Node>();
  for (const r of asArray(child(resourcesNode, 'resource') as Node | Node[] | undefined)) {
    const id = attr(r, 'identifier');
    if (id) resources.set(id, r);
  }
  if (resources.size === 0) throw new ManifestError('The manifest declares no <resource> elements.');

  const orgsNode = child(manifest, 'organizations') as Node | undefined;
  const orgs = asArray(child(orgsNode, 'organization') as Node | Node[] | undefined);
  const defaultOrgId = attr(orgsNode, 'default');
  const org = orgs.find(o => attr(o, 'identifier') === defaultOrgId) ?? orgs[0];
  if (defaultOrgId && org && attr(org, 'identifier') !== defaultOrgId) warnings.push(`Default organization "${defaultOrgId}" not found; using the first organization.`);

  const items: PackageItem[] = [];
  const resolveResource = (resId: string, parameters: string | null) => {
    const res = resources.get(resId);
    if (!res) return null;
    const href = attr(res, 'href');
    if (!href) return null;
    const typeAttr = (attr(res, 'scormtype') ?? '').toLowerCase();
    const scormType: 'sco' | 'asset' = typeAttr === 'sco' ? 'sco' : 'asset';
    return { href: applyParameters(joinHref(manifestBase, resourcesBase, attr(res, 'base'), href), parameters), scormType };
  };

  const walk = (nodes: Node[], depth: number) => {
    for (const node of nodes) {
      const identifier = attr(node, 'identifier') ?? `item-${items.length + 1}`;
      const ref = attr(node, 'identifierref');
      const resolved = ref ? resolveResource(ref, attr(node, 'parameters')) : null;
      if (ref && !resolved) warnings.push(`Item "${identifier}" references missing or href-less resource "${ref}".`);
      const visible = (attr(node, 'isvisible') ?? 'true').toLowerCase() !== 'false';
      const item: PackageItem = {
        identifier,
        title: text(child(node, 'title')) ?? identifier,
        depth,
        href: resolved?.href ?? null,
        scormType: resolved?.scormType ?? null,
      };
      const mastery = text(child(node, 'masteryscore'));
      const dataFromLms = text(child(node, 'datafromlms'));
      const threshold = text(child(node, 'completionThreshold'));
      if (mastery) item.masteryScore = mastery;
      if (dataFromLms) item.dataFromLms = dataFromLms;
      if (threshold) item.completionThreshold = threshold;
      if (visible || item.href) items.push(item);
      walk(asArray(child(node, 'item') as Node | Node[] | undefined), depth + 1);
    }
  };
  if (org) walk(asArray(child(org, 'item') as Node | Node[] | undefined), 0);

  // Packages with no organization (resource-only) are allowed if they have a SCO resource.
  if (!org || items.every(i => !i.href)) {
    const firstSco = [...resources.entries()].find(([, r]) => (attr(r, 'scormtype') ?? '').toLowerCase() === 'sco' && attr(r, 'href'));
    if (firstSco) {
      warnings.push('No launchable organization item found; launching the first SCO resource directly.');
      const resolved = resolveResource(firstSco[0], null)!;
      items.push({ identifier: firstSco[0], title: text(child(org, 'title')) ?? firstSco[0], depth: 0, ...resolved });
    }
  }

  const launchable = items.filter(i => i.href);
  const launchItem = launchable.find(i => i.scormType === 'sco') ?? launchable[0];
  if (!launchItem?.href) throw new ManifestError('The manifest does not identify a launchable SCO (no item references a resource with an href).');

  const scoCount = launchable.filter(i => i.scormType === 'sco').length;
  if (scoCount === 0) warnings.push('No resource is marked as a SCO; the launch item will run without SCORM tracking unless the content finds the API anyway.');
  if (scoCount > 1) warnings.push(`This package has ${scoCount} SCOs. The player launches the first SCO ("${launchItem.title}"); multi-SCO navigation/sequencing is not supported yet.`);

  const launchPath = safeRelativePath(launchItem.href);
  if (!launchPath) throw new ManifestError(`The launch file "${launchItem.href}" is not a safe package-relative path.`);
  if (!fileExists(launchPath)) throw new ManifestError(`The launch file "${launchPath}" referenced by the manifest is missing from the ZIP.`);

  return {
    scormVersion,
    schemaVersion,
    identifier: attr(manifest, 'identifier'),
    title: text(child(org, 'title')) ?? launchItem.title ?? null,
    organization: org ? { identifier: attr(org, 'identifier') ?? '', title: text(child(org, 'title')) ?? '' } : null,
    items,
    launchItemId: launchItem.identifier,
    launchHref: launchItem.href,
    scoCount,
    warnings,
  };
}
