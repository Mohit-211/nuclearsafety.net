import 'server-only';
import { and, desc, eq, inArray, notExists, type SQL } from 'drizzle-orm';
import { db, schema, type Database, type Tx } from '@/db';
import { audit } from '@/lib/audit';
import { isDuplicateKey } from '@/lib/actions/result';
import { canManageUser, type AdminScope } from '@/lib/auth/policy';
import { generateCertificateNumber } from '@/lib/certificates/number';
import { certificateFilename, renderCertificatePdf } from '@/lib/certificates/pdf';
import { absoluteUrl, sendEmail } from '@/lib/email';
import { formatDate } from '@/lib/format';
import { isCourseComplete } from '@/lib/scorm/cmi';

/*
 * Certificates of Training: one per completed attempt, issued in the same transaction
 * that records the completion (services/attempts.ts) and emailed to the learner as a PDF.
 * Completions without one (learners who finished before certificates were introduced)
 * are listed for admins, who generate them. Everyone sees the latest certificate per
 * learner and course.
 */

export type Certificate = typeof schema.certificates.$inferSelect;
type IssueInput = Pick<Certificate, 'attemptId' | 'userId' | 'courseId' | 'learnerName' | 'courseTitle' | 'completedAt'>;

/**
 * Issue the certificate for a completed attempt, or return the one it already has.
 * Concurrent commits of the same attempt are serialised by the attempt row lock.
 */
export async function issueCertificate(tx: Database | Tx, input: IssueInput): Promise<{ id: number; created: boolean }> {
  for (let tries = 0; tries < 3; tries++) {
    const [existing] = await tx.select({ id: schema.certificates.id }).from(schema.certificates)
      .where(eq(schema.certificates.attemptId, input.attemptId)).limit(1);
    if (existing) return { id: existing.id, created: false };
    try {
      const [created] = await tx.insert(schema.certificates).values({ ...input, number: generateCertificateNumber() }).$returningId();
      return { id: created!.id, created: true };
    } catch (err) {
      // Another request issued it first (found on the next read), or the number was taken (draw again).
      if (!isDuplicateKey(err)) throw err;
    }
  }
  throw new Error(`Could not issue a certificate for attempt ${input.attemptId}`);
}

export const certificateKey = (userId: number, courseId: number) => `${userId}:${courseId}`;

/**
 * Latest certificate per learner and course (keyed by certificateKey). Kept even if the
 * course was archived or the assignment removed: completion history is permanent.
 */
export async function latestCertificates(filter: { userIds?: number[]; courseIds?: number[] }): Promise<Map<string, Certificate>> {
  const map = new Map<string, Certificate>();
  if (filter.userIds?.length === 0 || filter.courseIds?.length === 0) return map;
  const where: SQL[] = [];
  if (filter.userIds) where.push(inArray(schema.certificates.userId, filter.userIds));
  if (filter.courseIds) where.push(inArray(schema.certificates.courseId, filter.courseIds));
  const rows = await db().select().from(schema.certificates)
    .where(and(...where))
    .orderBy(desc(schema.certificates.completedAt), desc(schema.certificates.id));
  for (const r of rows) if (!map.has(certificateKey(r.userId, r.courseId))) map.set(certificateKey(r.userId, r.courseId), r);
  return map;
}

/** The learner's own latest certificate for a course. */
export async function myCertificateForCourse(userId: number, courseId: number): Promise<Certificate | null> {
  return (await latestCertificates({ userIds: [userId], courseIds: [courseId] })).get(certificateKey(userId, courseId)) ?? null;
}

/** A certificate, if its learner is within the admin's scope. */
export async function certificateForAdmin(scope: AdminScope, certificateId: number): Promise<Certificate | null> {
  const [row] = await db()
    .select({ certificate: schema.certificates, role: schema.users.role, organizationId: schema.organizationMembers.organizationId })
    .from(schema.certificates)
    .innerJoin(schema.users, eq(schema.users.id, schema.certificates.userId))
    .leftJoin(schema.organizationMembers, eq(schema.organizationMembers.userId, schema.certificates.userId))
    .where(eq(schema.certificates.id, certificateId))
    .limit(1);
  return row && canManageUser(scope, { role: row.role, organizationId: row.organizationId ?? null }) ? row.certificate : null;
}

/** Latest completion per learner and course in scope that has no certificate at all. */
async function completionsWithoutCertificate(scope: AdminScope, filter: { userId?: number; courseId?: number }) {
  const where: SQL[] = [
    eq(schema.attempts.completionStatus, 'completed'),
    notExists(db().select({ id: schema.certificates.id }).from(schema.certificates)
      .where(and(eq(schema.certificates.userId, schema.attempts.userId), eq(schema.certificates.courseId, schema.attempts.courseId)))),
  ];
  if (filter.userId) where.push(eq(schema.attempts.userId, filter.userId));
  if (filter.courseId) where.push(eq(schema.attempts.courseId, filter.courseId));
  if (scope.kind === 'organization') where.push(eq(schema.organizationMembers.organizationId, scope.organizationId));
  const rows = await db()
    .select({
      attemptId: schema.attempts.id, userId: schema.attempts.userId, courseId: schema.attempts.courseId,
      completionStatus: schema.attempts.completionStatus, successStatus: schema.attempts.successStatus,
      completedAt: schema.attempts.completedAt, lastCommitAt: schema.attempts.lastCommitAt,
      learnerName: schema.users.name, email: schema.users.email, role: schema.users.role,
      organizationId: schema.organizationMembers.organizationId, organization: schema.organizations.name,
      courseTitle: schema.courses.title, courseCode: schema.courses.code,
    })
    .from(schema.attempts)
    .innerJoin(schema.users, eq(schema.users.id, schema.attempts.userId))
    .innerJoin(schema.courses, eq(schema.courses.id, schema.attempts.courseId))
    .leftJoin(schema.organizationMembers, eq(schema.organizationMembers.userId, schema.attempts.userId))
    .leftJoin(schema.organizations, eq(schema.organizations.id, schema.organizationMembers.organizationId))
    .where(and(...where))
    .orderBy(desc(schema.attempts.completedAt), desc(schema.attempts.attemptNumber));
  const seen = new Set<string>();
  return rows.flatMap(r => {
    const key = certificateKey(r.userId, r.courseId);
    if (!isCourseComplete(r) || !canManageUser(scope, { role: r.role, organizationId: r.organizationId ?? null }) || seen.has(key)) return [];
    seen.add(key);
    return [{ ...r, organizationId: r.organizationId ?? null, completedAt: r.completedAt ?? r.lastCommitAt ?? new Date() }];
  });
}

export type PendingCertificateRow = {
  attemptId: number; userId: number; learner: string; email: string; organization: string | null;
  courseId: number; course: string; courseCode: string; completedOn: string;
};

/** Completed courses without a certificate (e.g. finished before certificates were introduced), for admins to generate. */
export async function pendingCertificates(scope: AdminScope, filter: { userId?: number; courseId?: number } = {}): Promise<PendingCertificateRow[]> {
  return (await completionsWithoutCertificate(scope, filter)).map(r => ({
    attemptId: r.attemptId, userId: r.userId, learner: r.learnerName, email: r.email, organization: r.organization ?? null,
    courseId: r.courseId, course: r.courseTitle, courseCode: r.courseCode, completedOn: formatDate(r.completedAt),
  }));
}

/**
 * Admins: issue and email certificates for listed completions. Only completions still without a
 * certificate in the admin's scope are issued (others are skipped); each is dated with the
 * original completion and printed with the learner's current name and course title.
 */
export async function generateCertificates(scope: AdminScope, actorId: number, attemptIds: number[]) {
  const wanted = new Set(attemptIds);
  let issued = 0, emailed = 0;
  for (const r of await completionsWithoutCertificate(scope, {})) {
    if (!wanted.has(r.attemptId)) continue;
    const certificate = await issueCertificate(db(), {
      attemptId: r.attemptId, userId: r.userId, courseId: r.courseId, learnerName: r.learnerName, courseTitle: r.courseTitle, completedAt: r.completedAt,
    });
    if (!certificate.created) continue;
    issued++;
    await audit({ actorId, action: 'certificate.issued', entityType: 'certificate', entityId: certificate.id, subjectUserId: r.userId, courseId: r.courseId, organizationId: r.organizationId, metadata: { attemptId: r.attemptId } });
    if (await emailCertificate(certificate.id)) emailed++;
  }
  return { issued, emailed };
}

/** Learners: download link for their latest certificate of a course (resolved when clicked). */
export const certificateHref = (courseId: number) => `/api/courses/${courseId}/certificate`;
/** Admins: download link for a learner's certificate. */
export const adminCertificateHref = (certificateId: number) => `/api/admin/certificates/${certificateId}`;

const renderCertificate = (c: Certificate) =>
  renderCertificatePdf({ learnerName: c.learnerName, courseTitle: c.courseTitle, completedAt: c.completedAt, number: c.number });

/** The certificate PDF, displayed inline (download links use the `download` attribute). */
export async function certificatePdfResponse(c: Certificate): Promise<Response> {
  const pdf = await renderCertificate(c);
  const filename = certificateFilename(c.learnerName);
  const ascii = filename.normalize('NFKD').replace(/[^\x20-\x7e]/g, '');
  return new Response(new Blob([pdf as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'private, no-store',
    },
  });
}

/** Email a newly issued certificate to the learner as a PDF attachment. Returns whether it was sent; failures are logged, never thrown. */
export async function emailCertificate(certificateId: number): Promise<boolean> {
  try {
    const [row] = await db().select({ certificate: schema.certificates, email: schema.users.email })
      .from(schema.certificates)
      .innerJoin(schema.users, eq(schema.users.id, schema.certificates.userId))
      .where(eq(schema.certificates.id, certificateId));
    if (!row) return false;
    const c = row.certificate;
    await sendEmail({
      to: row.email,
      subject: `Your certificate: ${c.courseTitle}`,
      text: `Hello ${c.learnerName},\n\nCongratulations on completing "${c.courseTitle}".\n\nYour Certificate of Training is attached (certificate number ${c.number}). You can download it again at any time from your certificates page:\n\n${absoluteUrl('/certificates')}\n`,
      attachments: [{ filename: certificateFilename(c.learnerName), content: Buffer.from(await renderCertificate(c)), contentType: 'application/pdf' }],
    });
    return true;
  } catch (err) {
    console.error('[certificates] email failed', { certificateId, err });
    return false;
  }
}
