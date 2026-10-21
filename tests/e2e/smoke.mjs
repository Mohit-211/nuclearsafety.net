// End-to-end smoke test: drives a running production server through real HTTP +
// Server Actions as platform admin, learner and corporate admin.
// Requires a FRESH, migrated database with the seed admin from .env, and SMTP unset
// (invite links are read from the server log). See docs/TESTING.md.
//   SMOKE_BASE_URL=http://localhost:3100 SMOKE_APP_LOG=./app.log node tests/e2e/smoke.mjs
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PROJECT = process.cwd();
try { process.loadEnvFile('.env'); } catch { /* real env */ }
const require = createRequire(PROJECT + '/package.json');
const yazl = require('yazl');
const mysql = require('mysql2/promise');
const { PDFDocument } = require('pdf-lib');
const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3100';
const APP_LOG = process.env.SMOKE_APP_LOG ?? 'app.log';
const DB_URL = process.env.DATABASE_URL;
const ADMIN = { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD };

const manifest = require(PROJECT + '/.next/server/server-reference-manifest.json');
const actionId = {};
for (const [id, v] of Object.entries(manifest.node)) actionId[v.exportedName] = id;

let failures = 0;
// Streaming (loading.tsx) turns redirect()/notFound() into in-body markers with HTTP 200.
const redirected = async res => [302, 303, 307].includes(res.status) || (await res.text()).includes('NEXT_REDIRECT');
const notFoundRes = async res => res.status === 404 || (await res.text()).includes('NEXT_HTTP_ERROR_FALLBACK;404');
const html = async res => (await res.text()).replaceAll('<!-- -->', '');
const check = (name, cond, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? `  — ${extra}` : ''}`); if (!cond) failures++; };

class Client {
  cookie = '';
  async req(url, init = {}) {
    const res = await fetch(BASE + url, { redirect: 'manual', ...init, headers: { ...(init.headers ?? {}), ...(this.cookie ? { cookie: this.cookie } : {}) } });
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) { const [pair] = c.split(';'); if (pair.startsWith('ns_session=')) this.cookie = pair.endsWith('=') ? '' : pair; }
    return res;
  }
  async action(name, args, page = '/login') {
    const res = await this.req(page, { method: 'POST', headers: { 'Next-Action': actionId[name], 'Content-Type': 'text/plain;charset=UTF-8', Accept: 'text/x-component', Origin: BASE }, body: JSON.stringify(args) });
    const text = await res.text();
    const m = text.match(/\{"ok":(true|false)[^\n]*\}/);
    return m ? JSON.parse(m[0]) : { raw: text.slice(0, 300), status: res.status };
  }
}

async function zip(entries) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'smoke-'));
  const file = path.join(dir, 'course.zip');
  const z = new yazl.ZipFile();
  for (const [name, content] of entries) z.addBuffer(Buffer.from(content), name);
  z.end();
  const chunks = [];
  for await (const c of z.outputStream) chunks.push(c);
  writeFileSync(file, Buffer.concat(chunks));
  return readFileSync(file);
}

const manifest12 = title => `<?xml version="1.0"?><manifest identifier="smoke" xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
<metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
<organizations default="O"><organization identifier="O"><title>${title}</title><item identifier="I" identifierref="R"><title>Lesson</title></item></organization></organizations>
<resources><resource identifier="R" type="webcontent" adlcp:scormtype="sco" href="scormdriver/indexAPI.html"/></resources></manifest>`;

const upload = (client, buf, q = '') => client.req(`/api/admin/packages${q}`, { method: 'POST', headers: { 'Content-Type': 'application/zip', 'X-File-Name': 'smoke.zip', Origin: BASE }, body: buf }).then(async r => ({ status: r.status, body: await r.json() }));
const appLog = () => readFileSync(APP_LOG, 'utf8');
const lastLink = () => { const m = [...appLog().matchAll(/\/reset-password\?token=([\w%-]+)/g)]; return decodeURIComponent(m.at(-1)?.[1] ?? ''); };
const count = (text, needle) => text.split(needle).length - 1;
const CERT_NUMBER = /^[BCDFGHJKLMNPQRSTVWXZ]{11}-[BCDFGHJKLMNPQRSTVWXZ]{9}-[BCDFGHJKLMNPQRSTVWXZ]{10}$/;
const db = await mysql.createConnection({ uri: DB_URL });

// ---- anonymous ----------------------------------------------------------------
const anon = new Client();
check('anonymous / redirects to login', [307, 303, 302].includes((await anon.req('/')).status));
check('anonymous /admin redirects', [307, 303, 302].includes((await anon.req('/admin')).status));
check('anonymous upload rejected', (await upload(anon, Buffer.from('x'))).status === 401);

// ---- platform admin ----------------------------------------------------------------
const admin = new Client();
let r = await admin.action('login', [{ email: ADMIN.email, password: 'wrong-password', remember: false }]);
check('wrong password rejected', r.ok === false, r.error);
r = await admin.action('login', [{ email: ADMIN.email, password: ADMIN.password, remember: true }]);
check('admin login', r.ok === true && admin.cookie, JSON.stringify(r).slice(0, 120));
const adminHtml = await (await admin.req('/admin')).text();
check('admin dashboard renders', adminHtml.includes('Training overview'));

const bad = await upload(admin, await zip([['index.html', 'x']]));
check('invalid package rejected with useful error', bad.status === 422 && /imsmanifest/.test(bad.body.error), bad.body.error);
const notZip = await upload(admin, Buffer.from('not a zip at all'));
check('non-zip rejected', notZip.status === 422, notZip.body.error);

const v1 = await upload(admin, await zip([['imsmanifest.xml', manifest12('Smoke Course')], ['scormdriver/indexAPI.html', '<html><body>SCO v1</body></html>'], ['media/clip.mp4', 'x'.repeat(5000)]]));
check('SCORM 1.2 upload registers course', v1.status === 200 && v1.body.ok && v1.body.scormVersion === '1.2', JSON.stringify(v1.body));
const courseId = v1.body.courseId;

r = await admin.action('setCourseStatusAction', [{ courseId, status: 'published' }], '/admin');
check('publish course', r.ok === true, JSON.stringify(r));

r = await admin.action('createUserAction', [{ name: 'Lena Learner', email: 'lena@example.com', jobTitle: '', department: 'Ops', organizationId: null, orgRole: 'member', platformRole: 'learner' }], '/admin');
check('create individual learner', r.ok === true, JSON.stringify(r));
const learnerId = r.data?.userId;
await new Promise(res => setTimeout(res, 300));
const inviteToken = lastLink();
check('invite link logged (no SMTP)', inviteToken.length > 20);

r = await admin.action('saveCourseEnrollmentAction', [{ courseId, add: [learnerId], remove: [], dueDate: '2026-12-31' }], '/admin');
check('assign course to learner', r.ok === true, JSON.stringify(r));

// ---- admin-set passwords -----------------------------------------------------------
const pia = { name: 'Pia Password', email: 'pia@example.com', jobTitle: '', department: '', organizationId: null, orgRole: 'member', platformRole: 'learner' };
r = await admin.action('createUserAction', [{ ...pia, password: 'too-short' }], '/admin');
check('admin-set password must meet the policy', r.ok === false && !!r.fieldErrors?.password, JSON.stringify(r));
const logMark = appLog().length;
r = await admin.action('createUserAction', [{ ...pia, password: 'Pia-pass-2026' }], '/admin');
check('create learner with an admin-set password', r.ok === true, JSON.stringify(r));
const piaId = r.data?.userId;
await new Promise(res => setTimeout(res, 300));
check('…no invite email sent', !appLog().slice(logMark).includes('To: pia@example.com'));
const piaClient = new Client();
r = await piaClient.action('login', [{ email: 'pia@example.com', password: 'Pia-pass-2026', remember: false }]);
check('…learner signs in with it straight away', r.ok === true, JSON.stringify(r));
r = await admin.action('setUserPasswordAction', [{ userId: piaId, password: 'Pia-new-pass-2026' }], '/admin');
check('admin resets a password', r.ok === true, JSON.stringify(r));
check('…learner signed out everywhere', [307, 303, 302].includes((await piaClient.req('/my-training')).status));
r = await piaClient.action('login', [{ email: 'pia@example.com', password: 'Pia-pass-2026', remember: false }]);
check('…old password rejected', r.ok === false);
r = await piaClient.action('login', [{ email: 'pia@example.com', password: 'Pia-new-pass-2026', remember: false }]);
check('…new password works', r.ok === true);

r = await admin.action('createUserAction', [{ ...pia, name: 'Ivan Invite', email: 'ivan@example.com' }], '/admin');
const ivanId = r.data?.userId;
await new Promise(res => setTimeout(res, 300));
const ivanToken = lastLink();
r = await admin.action('setUserPasswordAction', [{ userId: ivanId, password: 'Ivan-pass-2026' }], '/admin');
check('admin sets the password of an invited user', r.ok === true, JSON.stringify(r));
r = await anon.action('resetPassword', [{ token: ivanToken, password: 'ivan-own-pass-1', confirm: 'ivan-own-pass-1' }], '/reset-password');
check('…their emailed invite link stops working', r.ok === false, r.error);
const [[adminRow]] = await db.query('SELECT id FROM users WHERE email=?', [ADMIN.email]);
r = await admin.action('setUserPasswordAction', [{ userId: adminRow.id, password: 'admin-other-pass-1' }], '/admin');
check('admins cannot reset their own password there', r.ok === false, r.error);
const [[{ pwEvents }]] = await db.query("SELECT COUNT(*) pwEvents FROM audit_events WHERE action='user.password_set'");
check('password changes audited', pwEvents === 2, `n=${pwEvents}`);

// ---- learner ----------------------------------------------------------------------
const learner = new Client();
check('reset page accepts invite token', (await (await learner.req(`/reset-password?token=${encodeURIComponent(inviteToken)}`)).text()).includes('Set up your account'));
r = await learner.action('resetPassword', [{ token: inviteToken, password: 'learner-pass-123', confirm: 'learner-pass-123' }], '/reset-password');
check('learner sets password', r.ok === true, JSON.stringify(r));
r = await learner.action('resetPassword', [{ token: inviteToken, password: 'learner-pass-123', confirm: 'learner-pass-123' }], '/reset-password');
check('invite token is single-use', r.ok === false);
r = await learner.action('login', [{ email: 'lena@example.com', password: 'learner-pass-123', remember: false }]);
check('learner login', r.ok === true);
check('learner cannot open admin', [307, 303, 302].includes((await learner.req('/admin')).status));
check('learner forbidden from upload', (await upload(learner, Buffer.from('x'))).status === 403);
check('my courses lists assigned course', (await (await learner.req('/my-training')).text()).includes('Smoke Course'));

const playHtml = await (await learner.req(`/courses/${courseId}/play`)).text();
const attemptId = Number(playHtml.match(/attemptId\\?":(\d+)/)?.[1]);
const launchUrl = playHtml.match(/(\/scorm\/\d+\/scormdriver\/indexAPI\.html)/)?.[1];
check('player creates attempt + launch url', attemptId > 0 && !!launchUrl, `${attemptId} ${launchUrl}`);
check('player starts ab-initio', /entry\\?":\\?"ab-initio/.test(playHtml));

check('learner can load SCO', (await (await learner.req(launchUrl)).text()).includes('SCO v1'));
check('anonymous cannot load SCO', (await anon.req(launchUrl)).status === 403);
const vid = await learner.req(launchUrl.replace('scormdriver/indexAPI.html', 'media/clip.mp4'), { headers: { Range: 'bytes=100-199' } });
check('range request for video', vid.status === 206 && vid.headers.get('content-range') === 'bytes 100-199/5000' && (await vid.arrayBuffer()).byteLength === 100);
check('path traversal blocked', [400, 403, 404].includes((await learner.req(launchUrl.replace('scormdriver/indexAPI.html', '..%2F..%2F.env'))).status));

const commit = (c, body, term = false) => c.req(`/api/attempts/${attemptId}/commit${term ? '?terminate=true' : ''}`, { method: 'POST', headers: { 'Content-Type': term ? 'text/plain;charset=UTF-8' : 'application/json', Origin: BASE }, body: JSON.stringify(body) });
let res = await commit(learner, { cmi: { suspend_data: 'page=3', core: { lesson_status: 'incomplete', lesson_location: 'p3', exit: 'suspend', score: { raw: '', min: '', max: '' } } } });
check('commit accepted', res.status === 200 && (await res.json()).result === true);
check('anonymous commit rejected', (await commit(anon, { cmi: {} })).status === 401);
check('admin cannot commit to learner attempt', (await commit(admin, { cmi: { core: {} } })).status === 404);
check('cross-site commit rejected', (await learner.req(`/api/attempts/${attemptId}/commit`, { method: 'POST', headers: { Origin: 'https://evil.example' }, body: '{"cmi":{}}' })).status === 403);
res = await commit(learner, { cmi: { suspend_data: 'page=3', core: { lesson_status: 'incomplete', lesson_location: 'p3', exit: 'suspend', total_time: '0000:05:00', score: { raw: '' } } } }, true);
check('terminate commit accepted', res.status === 200);

const resumeHtml = await (await learner.req(`/courses/${courseId}/play`)).text();
check('resume: same attempt', Number(resumeHtml.match(/attemptId\\?":(\d+)/)?.[1]) === attemptId);
check('resume: entry=resume + suspend data + location', /entry\\?":\\?"resume/.test(resumeHtml) && /page=3/.test(resumeHtml) && /lesson_location\\?":\\?"p3/.test(resumeHtml));
check('in progress not complete', (await (await learner.req('/certificates')).text()).includes('No certificates yet'));

res = await commit(learner, { cmi: { suspend_data: 'done', core: { lesson_status: 'passed', lesson_location: 'end', exit: '', score: { raw: '90', min: '0', max: '100' } } } });
check('passing commit', res.status === 200);
res = await commit(learner, { cmi: { core: { lesson_status: 'incomplete' } } });
check('later incomplete commit accepted (sticky completion)', res.status === 200);
res = await commit(learner, { cmi: { core: { lesson_status: 'passed', score: { raw: '90' } } } });
check('repeated completion report accepted', res.status === 200);
const certHtml = await html(await learner.req('/certificates'));
check('certificate issued after pass', certHtml.includes('Smoke Course') && certHtml.includes('1 certificate earned'));

// ---- certificates ---------------------------------------------------------------------
const certRows = (await db.query('SELECT * FROM certificates WHERE attempt_id=?', [attemptId]))[0];
const cert = certRows[0];
check('one certificate recorded for the completion', certRows.length === 1 && CERT_NUMBER.test(cert.number) && cert.learner_name === 'Lena Learner' && cert.course_title === 'Smoke Course', JSON.stringify(certRows));
check('certificates page shows its number', certHtml.includes(cert.number));
await new Promise(res => setTimeout(res, 500));
check('certificate emailed once, as a PDF attachment', count(appLog(), 'To: lena@example.com\nSubject: Your certificate: Smoke Course') === 1
  && appLog().includes(`certificate number ${cert.number}`) && appLog().includes('[attachment: Certificate-Lena-Learner.pdf, application/pdf'));
const pdfRes = await learner.req(`/api/courses/${courseId}/certificate`);
const pdfBytes = Buffer.from(await pdfRes.arrayBuffer());
check('learner downloads the certificate PDF', pdfRes.status === 200 && pdfRes.headers.get('content-type') === 'application/pdf'
  && pdfBytes.subarray(0, 5).toString() === '%PDF-' && pdfRes.headers.get('content-disposition')?.includes('filename="Certificate-Lena-Learner.pdf"'), pdfRes.headers.get('content-disposition'));
const pdfDoc = await PDFDocument.load(pdfBytes);
check('…with the stored number and name', pdfDoc.getKeywords() === cert.number && pdfDoc.getTitle() === 'Certificate of Training — Lena Learner', `${pdfDoc.getKeywords()} ${pdfDoc.getTitle()}`);
check('anonymous cannot download certificates', (await anon.req(`/api/courses/${courseId}/certificate`)).status === 401);
check('learner without a certificate gets 404', (await piaClient.req(`/api/courses/${courseId}/certificate`)).status === 404);
const adminPdf = await admin.req(`/api/admin/certificates/${cert.id}`);
check('admin downloads the learner certificate', adminPdf.status === 200 && Buffer.from(await adminPdf.arrayBuffer()).subarray(0, 5).toString() === '%PDF-');
check('learner cannot use the admin certificate route', (await learner.req(`/api/admin/certificates/${cert.id}`)).status === 403);
check('admin learner page links the certificate', (await html(await admin.req(`/admin/learners/${learnerId}`))).includes(`/api/admin/certificates/${cert.id}`));
check('admin course page links the certificate', (await html(await admin.req(`/admin/courses/${courseId}`))).includes(`/api/admin/certificates/${cert.id}`));
check('learner dashboard offers the download', (await html(await learner.req('/'))).includes(`/api/courses/${courseId}/certificate`));
check('course page offers the download', (await html(await learner.req(`/courses/${courseId}`))).includes(`/api/courses/${courseId}/certificate`));

// ---- versioning -----------------------------------------------------------------
const v2 = await upload(admin, await zip([['imsmanifest.xml', manifest12('Smoke Course v2')], ['scormdriver/indexAPI.html', '<html><body>SCO v2</body></html>']]), `?courseId=${courseId}`);
check('upload version 2', v2.body.ok && v2.body.versionNumber === 2 && !v2.body.createdCourse, JSON.stringify(v2.body));
r = await admin.action('activateVersionAction', [{ courseId, versionId: v2.body.versionId }], '/admin');
check('activate version 2', r.ok === true);
const after = await (await learner.req(`/courses/${courseId}/play`)).text();
check('existing attempt stays on version 1', after.includes(launchUrl) && Number(after.match(/attemptId\\?":(\d+)/)?.[1]) === attemptId);

// ---- reports ----------------------------------------------------------------------
const reportHtml = await (await admin.req('/admin/reports')).text();
check('report shows result', reportHtml.includes('Lena Learner') && reportHtml.includes('Passed'));
const csv = await (await admin.req('/api/admin/reports/export')).text();
check('CSV export', csv.includes('Smoke Course') && csv.includes('"90"'), csv.split('\n')[1]);
check('learner cannot export CSV', (await learner.req('/api/admin/reports/export')).status === 403);

// ---- corporate tenancy -------------------------------------------------------------
r = await admin.action('createOrganizationAction', [{ name: 'Acme Nuclear' }], '/admin');
const orgA = r.data?.organizationId;
r = await admin.action('createOrganizationAction', [{ name: 'Other Corp' }], '/admin');
const orgB = r.data?.organizationId;
check('create organizations', orgA > 0 && orgB > 0);
r = await admin.action('createUserAction', [{ name: 'Carl Corp', email: 'carl@acme.test', jobTitle: '', department: '', organizationId: orgA, orgRole: 'admin', platformRole: 'learner' }], '/admin');
await new Promise(res => setTimeout(res, 300));
const carlToken = lastLink();
r = await admin.action('createUserAction', [{ name: 'Bob Other', email: 'bob@other.test', jobTitle: '', department: '', organizationId: orgB, orgRole: 'member', platformRole: 'learner' }], '/admin');
const bobId = r.data?.userId;

const carl = new Client();
await carl.action('resetPassword', [{ token: carlToken, password: 'carl-pass-1234', confirm: 'carl-pass-1234' }], '/reset-password');
r = await carl.action('login', [{ email: 'carl@acme.test', password: 'carl-pass-1234', remember: false }]);
check('corporate admin login', r.ok === true);
check('corporate admin sees admin console', (await (await carl.req('/admin')).text()).includes('Training overview'));
check('corporate admin blocked from organizations page', await redirected(await carl.req('/admin/organizations')));
check('corporate admin cannot upload', (await upload(carl, Buffer.from('x'))).status === 403);
check('corporate admin cannot view other-org learner', await notFoundRes(await carl.req(`/admin/learners/${bobId}`)));
check('corporate admin cannot view individual learner', await notFoundRes(await carl.req(`/admin/learners/${learnerId}`)));
r = await carl.action('createUserAction', [{ name: 'Mia Member', email: 'mia@acme.test', jobTitle: '', department: '', organizationId: orgB, orgRole: 'admin', platformRole: 'platform_admin' }], '/admin');
check('corporate admin creates member (scope forced)', r.ok === true);
const miaId = r.data?.userId;
const [[mia]] = await db.query('SELECT u.role, m.organization_id, m.role AS orgRole FROM users u JOIN organization_members m ON m.user_id=u.id WHERE u.id=?', [miaId]);
check('…forced into own org as plain learner', mia.role === 'learner' && mia.organization_id === orgA && mia.orgRole === 'member', JSON.stringify(mia));
r = await carl.action('saveCourseEnrollmentAction', [{ courseId, add: [miaId], remove: [], dueDate: null }], '/admin');
check('corporate admin cannot assign ungranted course', r.ok === false, r.error);
r = await admin.action('setCourseAccessAction', [{ organizationId: orgA, courseId, granted: true }], '/admin');
r = await carl.action('saveCourseEnrollmentAction', [{ courseId, add: [miaId], remove: [], dueDate: null }], '/admin');
check('corporate admin assigns granted course to own member', r.ok === true, r.error);
r = await carl.action('saveCourseEnrollmentAction', [{ courseId, add: [bobId], remove: [], dueDate: null }], '/admin');
check('corporate admin cannot assign to other org', r.ok === false, r.error);
r = await carl.action('setUserStatusAction', [{ userId: learnerId, status: 'inactive' }], '/admin');
check('corporate admin cannot deactivate outsider', r.ok === false);
r = await carl.action('setUserPasswordAction', [{ userId: learnerId, password: 'outsider-pass-123' }], '/admin');
check('corporate admin cannot set an outsider\'s password', r.ok === false, r.error);
r = await carl.action('setUserPasswordAction', [{ userId: miaId, password: 'Mia-pass-20261' }], '/admin');
check('corporate admin sets own member\'s password', r.ok === true, JSON.stringify(r));
r = await carl.action('createUserAction', [{ name: 'Max Member', email: 'max@acme.test', jobTitle: '', department: '', password: 'Max-pass-20261' }], '/admin');
check('corporate admin creates a member with a password', r.ok === true, JSON.stringify(r));
check('corporate admin cannot download an outsider\'s certificate', (await carl.req(`/api/admin/certificates/${cert.id}`)).status === 404);
const carlCsv = await (await carl.req('/api/admin/reports/export')).text();
check('corporate report scoped to own org', carlCsv.includes('Mia Member') && !carlCsv.includes('Lena Learner'));

// ---- retake requests ----------------------------------------------------------------
r = await learner.action('requestRetakeAction', [{ courseId, reason: 'Refresher' }], `/courses/${courseId}`);
check('learner requests retake of completed course', r.ok === true, JSON.stringify(r));
r = await learner.action('requestRetakeAction', [{ courseId }], `/courses/${courseId}`);
check('duplicate pending request rejected', r.ok === false, r.error);
const retakePlay = await (await learner.req(`/courses/${courseId}/play`)).text();
check('still review mode while pending', /lesson_mode\\?":\\?"review/.test(retakePlay));
check('player offers the certificate download', retakePlay.includes(`/api/courses/${courseId}/certificate`) && /hasCertificate\\?":true/.test(retakePlay));
const [[reqRow]] = await db.query("SELECT id FROM retake_requests WHERE status='pending' ORDER BY id DESC LIMIT 1");
r = await carl.action('decideRetakeAction', [{ requestId: reqRow.id, approve: true }], '/admin');
check('corporate admin cannot decide outsider retake', r.ok === false, r.error);
r = await admin.action('decideRetakeAction', [{ requestId: reqRow.id, approve: true, note: 'ok' }], '/admin');
check('platform admin approves retake', r.ok === true, JSON.stringify(r));
const retakeHtml = await (await learner.req(`/courses/${courseId}/play`)).text();
check('approved retake starts a fresh attempt', /entry\\?":\\?"ab-initio/.test(retakeHtml) && Number(retakeHtml.match(/attemptId\\?":(\d+)/)?.[1]) !== attemptId);
check('certificate kept after retake approval', (await html(await learner.req('/certificates'))).includes('Smoke Course'));
check('…and still downloadable during the retake', (await html(await learner.req(`/courses/${courseId}`))).includes(`/api/courses/${courseId}/certificate`)
  && (await learner.req(`/api/courses/${courseId}/certificate`)).status === 200);

// Completions from before certificates existed: listed for admins, who generate them.
await db.query('DELETE FROM certificates WHERE id=?', [cert.id]);
check('without a certificate the learner has none to download', (await html(await learner.req('/certificates'))).includes('No certificates yet')
  && (await learner.req(`/api/courses/${courseId}/certificate`)).status === 404);
check('admin dashboard lists the certificate to generate', (await html(await admin.req('/admin'))).includes('Certificates to generate'));
check('…as does the learner page', (await html(await admin.req(`/admin/learners/${learnerId}`))).includes('Certificates to generate'));
r = await carl.action('generateCertificatesAction', [{ attemptIds: [attemptId] }], '/admin');
check('corporate admin cannot generate an outsider\'s certificate', r.ok === true && r.data.issued === 0, JSON.stringify(r));
const genMark = appLog().length;
r = await admin.action('generateCertificatesAction', [{ attemptIds: [attemptId] }], '/admin');
const [[generated]] = await db.query('SELECT c.number, c.completed_at = a.completed_at AS sameDay FROM certificates c JOIN attempts a ON a.id = c.attempt_id WHERE c.attempt_id=?', [attemptId]);
check('admin generates it, dated with the original completion', r.ok === true && r.data.issued === 1 && r.data.emailed === 1 && generated?.sameDay === 1 && CERT_NUMBER.test(generated.number), JSON.stringify({ r, generated }));
check('…the learner is emailed it', appLog().slice(genMark).includes(`certificate number ${generated?.number}`) && appLog().slice(genMark).includes('[attachment: Certificate-Lena-Learner.pdf'));
check('…and can download it', (await html(await learner.req('/certificates'))).includes(generated?.number) && (await learner.req(`/api/courses/${courseId}/certificate`)).status === 200);
r = await admin.action('generateCertificatesAction', [{ attemptIds: [attemptId] }], '/admin');
check('generating again changes nothing', r.ok === true && r.data.issued === 0, JSON.stringify(r));
check('…and nothing is left to generate', !(await html(await admin.req('/admin'))).includes('Certificates to generate'));
const [[{ genEvents }]] = await db.query("SELECT COUNT(*) genEvents FROM audit_events WHERE action='certificate.issued'");
check('generation audited', genEvents === 1, `n=${genEvents}`);

const retakeAttemptId = Number(retakeHtml.match(/attemptId\\?":(\d+)/)?.[1]);
res = await learner.req(`/api/attempts/${retakeAttemptId}/commit?terminate=true`, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8', Origin: BASE },
  body: JSON.stringify({ cmi: { core: { lesson_status: 'passed', exit: '', total_time: '0000:10:00', score: { raw: '96', min: '0', max: '100' } } } }) });
await new Promise(res => setTimeout(res, 500));
const [[retakeCert]] = await db.query('SELECT number FROM certificates WHERE attempt_id=?', [retakeAttemptId]);
const retakeCerts = await html(await learner.req('/certificates'));
check('completing a retake issues and emails a new certificate', res.status === 200 && !!retakeCert && retakeCert.number !== generated.number
  && retakeCerts.includes(retakeCert.number) && retakeCerts.includes('1 certificate earned') && appLog().includes(`certificate number ${retakeCert.number}`), JSON.stringify(retakeCert));

// ---- deactivation -----------------------------------------------------------------
r = await admin.action('setUserStatusAction', [{ userId: learnerId, status: 'inactive' }], '/admin');
check('deactivate learner', r.ok === true);
check('deactivated learner session revoked', [307, 303, 302].includes((await learner.req('/my-training')).status));

const [[att]] = await db.query('SELECT version_id, completion_status, success_status, score_raw, total_time_seconds FROM attempts WHERE id=?', [attemptId]);
check('DB attempt state', att.completion_status === 'completed' && att.success_status === 'passed' && att.score_raw === 90 && att.total_time_seconds === 300, JSON.stringify(att));
const [[{ n }]] = await db.query("SELECT COUNT(*) n FROM audit_events WHERE action IN ('course_version.activated','learner.course_completed','learner.course_passed','assignment.created')");
check('audit events recorded', n >= 5, `n=${n}`);
await db.end();

console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
