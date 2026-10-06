import { createWriteStream } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import yazl from 'yazl';

export const manifest12 = (opts: { href?: string; extraItems?: string; mastery?: string } = {}) => `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="com.example.course" version="1"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="ORG-1">
    <organization identifier="ORG-1">
      <title>Nuclear Safety Fundamentals</title>
      <item identifier="ITEM-1" identifierref="RES-1" isvisible="true">
        <title>Lesson 1</title>
        ${opts.mastery ? `<adlcp:masteryscore>${opts.mastery}</adlcp:masteryscore>` : ''}
      </item>
      ${opts.extraItems ?? ''}
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-1" type="webcontent" adlcp:scormtype="sco" href="${opts.href ?? 'scormdriver/indexAPI.html'}">
      <file href="${opts.href ?? 'scormdriver/indexAPI.html'}"/>
    </resource>
  </resources>
</manifest>`;

export const manifest2004 = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="com.example.course2004" version="1"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
  xmlns:imsss="http://www.imsglobal.org/xsd/imsss">
  <metadata><schema>ADL SCORM</schema><schemaversion>2004 3rd Edition</schemaversion></metadata>
  <organizations default="ORG">
    <organization identifier="ORG">
      <title>Radiation Protection</title>
      <item identifier="ITEM" identifierref="RES" parameters="?mode=full">
        <title>Main</title>
        <adlcp:completionThreshold>0.8</adlcp:completionThreshold>
      </item>
    </organization>
  </organizations>
  <resources xml:base="content/">
    <resource identifier="RES" type="webcontent" adlcp:scormType="sco" href="index.html"/>
  </resources>
</manifest>`;

/** Build a ZIP on disk from name → content entries. Options allow malicious attributes. */
export async function makeZip(entries: Array<{ name: string; content?: string; symlink?: boolean }>): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'scorm-test-'));
  const file = path.join(dir, 'pkg.zip');
  const zip = new yazl.ZipFile();
  for (const e of entries) {
    // yazl validates names, so smuggle unsafe names via a placeholder then patch below.
    const opts = e.symlink ? { mode: 0o120777 } : {};
    zip.addBuffer(Buffer.from(e.content ?? 'x'), e.name, opts);
  }
  zip.end();
  await new Promise<void>((resolve, reject) => {
    zip.outputStream.pipe(createWriteStream(file)).on('close', () => resolve()).on('error', reject);
  });
  return file;
}
