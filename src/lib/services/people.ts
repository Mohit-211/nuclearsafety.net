import 'server-only';
import { and, desc, eq, inArray, like, max, or, type SQL } from 'drizzle-orm';
import { db, schema } from '@/db';
import { audit } from '@/lib/audit';
import { canChangeRoles, canManageUser, type AdminScope, type OrgRole, type PlatformRole } from '@/lib/auth/policy';
import { destroyUserSessions } from '@/lib/auth/session';
import { formatDate, formatRelativeDay } from '@/lib/format';
import { UserError } from '@/lib/actions/result';
import type { ActivityRow, AdminLearnerRow, LearnerEnrollmentRow, LearnerStatusLabel } from '@/lib/types';
import { averageProgress, loadEnrollments, summarize } from './enrollments';
import { sendPasswordLink } from './password-tokens';

/** Users visible to a scope, with their membership. */
async function scopedUsers(scope: AdminScope, userIds?: number[]) {
  const where: SQL[] = [];
  if (scope.kind === 'organization') {
    where.push(eq(schema.organizationMembers.organizationId, scope.organizationId));
    where.push(eq(schema.users.role, 'learner'));
  }
  if (userIds) where.push(inArray(schema.users.id, userIds.length ? userIds : [-1]));
  return db()
    .select({
      id: schema.users.id, name: schema.users.name, email: schema.users.email, role: schema.users.role, status: schema.users.status,
      jobTitle: schema.users.jobTitle, department: schema.users.department, hasPassword: schema.users.passwordHash,
      lastLoginAt: schema.users.lastLoginAt, createdAt: schema.users.createdAt,
      organizationId: schema.organizationMembers.organizationId, orgRole: schema.organizationMembers.role, organizationName: schema.organizations.name,
    })
    .from(schema.users)
    .leftJoin(schema.organizationMembers, eq(schema.organizationMembers.userId, schema.users.id))
    .leftJoin(schema.organizations, eq(schema.organizations.id, schema.organizationMembers.organizationId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(schema.users.name);
}

type ScopedUser = Awaited<ReturnType<typeof scopedUsers>>[number];

export function roleLabel(u: { role: PlatformRole; orgRole: OrgRole | null; organizationId: number | null }) {
  if (u.role === 'platform_admin') return 'Platform admin';
  if (u.orgRole === 'admin') return 'Corporate admin';
  return u.organizationId ? 'Corporate learner' : 'Individual learner';
}

export async function listLearners(scope: AdminScope): Promise<AdminLearnerRow[]> {
  const users = await scopedUsers(scope);
  const enrollments = await loadEnrollments({ userIds: users.map(u => u.id) });
  const lastCommits = users.length
    ? await db().select({ userId: schema.attempts.userId, last: max(schema.attempts.lastCommitAt) }).from(schema.attempts)
      .where(inArray(schema.attempts.userId, users.map(u => u.id))).groupBy(schema.attempts.userId)
    : [];
  const lastCommitBy = new Map(lastCommits.map(r => [r.userId, r.last]));

  return users.map(u => {
    const mine = enrollments.filter(e => e.userId === u.id);
    const summaries = mine.map(e => summarize(e));
    const last = [u.lastLoginAt, lastCommitBy.get(u.id) ?? null].filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0];
    return {
      id: u.id, name: u.name, email: u.email, department: u.department ?? '—',
      organization: u.organizationName ?? null, organizationId: u.organizationId ?? null,
      roleLabel: roleLabel(u),
      courseIds: mine.map(e => e.courseId),
      progress: averageProgress(summaries.map(s => s.progress)),
      status: learnerStatus(u, summaries.some(s => s.overdue)),
      lastActivity: last ? formatRelativeDay(last) : 'Never',
    };
  });
}

function learnerStatus(u: Pick<ScopedUser, 'status' | 'hasPassword'>, overdue: boolean): LearnerStatusLabel {
  if (u.status === 'inactive') return 'Inactive';
  if (!u.hasPassword) return 'Invited';
  return overdue ? 'Overdue' : 'Active';
}

export async function getLearnerDetail(scope: AdminScope, userId: number) {
  const [u] = await scopedUsers(scope, [userId]);
  if (!u || !canManageUser(scope, u)) return null;

  const enrollments = await loadEnrollments({ userIds: [userId] });
  const rows: LearnerEnrollmentRow[] = enrollments.map(e => {
    const s = summarize(e);
    return {
      courseId: e.courseId, code: e.courseCode, title: e.courseTitle, category: e.courseCategory ?? '—',
      enrolledOn: formatDate(e.assignedAt), due: e.dueDate ? formatDate(e.dueDate) : null,
      progress: s.progress, score: s.score, result: s.result, status: s.status,
      completedOn: s.completedAt ? formatDate(s.completedAt) : null,
      versionNumber: e.attempt?.versionNumber ?? null,
    };
  });
  const summaries = enrollments.map(e => summarize(e));
  return {
    user: { ...u, hasPassword: !!u.hasPassword, roleLabel: roleLabel(u), statusLabel: learnerStatus(u, summaries.some(s => s.overdue)) },
    enrollments: rows,
    progress: averageProgress(summaries.map(s => s.progress)),
    activity: await activityFeed(scope, { userId, limit: 10 }),
  };
}

const actionLabels: Record<string, [string, ActivityRow['status']]> = {
  'learner.course_started': ['Started course', 'In progress'],
  'learner.course_completed': ['Completed course', 'Completed'],
  'learner.course_passed': ['Passed assessment', 'Completed'],
  'learner.course_failed': ['Failed assessment', 'Failed'],
  'assignment.created': ['Course assigned', 'Info'],
  'assignment.removed': ['Assignment removed', 'Info'],
  'retake.requested': ['Requested retake', 'Info'],
  'retake.approved': ['Retake approved', 'In progress'],
  'retake.declined': ['Retake declined', 'Info'],
};

/** Learner activity (starts, completions, results, assignments) within a scope. */
export async function activityFeed(scope: AdminScope, opts: { userId?: number; courseId?: number; limit: number }): Promise<ActivityRow[]> {
  const where: SQL[] = [or(like(schema.auditEvents.action, 'learner.%'), inArray(schema.auditEvents.action, ['assignment.created', 'assignment.removed', 'retake.requested', 'retake.approved', 'retake.declined']))!];
  if (opts.userId) where.push(eq(schema.auditEvents.subjectUserId, opts.userId));
  if (opts.courseId) where.push(eq(schema.auditEvents.courseId, opts.courseId));
  if (scope.kind === 'organization') where.push(eq(schema.organizationMembers.organizationId, scope.organizationId));
  const rows = await db()
    .select({ id: schema.auditEvents.id, action: schema.auditEvents.action, createdAt: schema.auditEvents.createdAt, learner: schema.users.name, course: schema.courses.title })
    .from(schema.auditEvents)
    .innerJoin(schema.users, eq(schema.users.id, schema.auditEvents.subjectUserId))
    .leftJoin(schema.courses, eq(schema.courses.id, schema.auditEvents.courseId))
    .leftJoin(schema.organizationMembers, eq(schema.organizationMembers.userId, schema.auditEvents.subjectUserId))
    .where(and(...where))
    .orderBy(desc(schema.auditEvents.createdAt))
    .limit(opts.limit);
  return rows.map(r => {
    const [action, status] = actionLabels[r.action] ?? [r.action, 'Info' as const];
    return { id: r.id, learner: r.learner, action, course: r.course ?? '—', date: formatDate(r.createdAt), status };
  });
}

export type CreateUserInput = {
  name: string; email: string; jobTitle: string | null; department: string | null;
  /** Platform admins only: organization + org role, or a platform role. Ignored/forced for corporate admins. */
  organizationId: number | null; orgRole: OrgRole; platformRole: PlatformRole;
};

/** Create an account and email a set-password invite. Corporate admins can only add members to their own organization. */
export async function createUser(scope: AdminScope, actorId: number, input: CreateUserInput) {
  const organizationId = scope.kind === 'organization' ? scope.organizationId : input.organizationId;
  const orgRole: OrgRole = scope.kind === 'organization' ? 'member' : input.orgRole;
  const platformRole: PlatformRole = scope.kind === 'organization' ? 'learner' : input.platformRole;
  if (platformRole === 'platform_admin' && organizationId) throw new UserError('Platform admins cannot belong to an organization.');

  const [existing] = await db().select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, input.email)).limit(1);
  if (existing) throw new UserError('An account with this email already exists.', { email: 'An account with this email already exists.' });
  if (organizationId) {
    const [org] = await db().select({ id: schema.organizations.id }).from(schema.organizations).where(eq(schema.organizations.id, organizationId));
    if (!org) throw new UserError('Organization not found.');
  }

  const userId = await db().transaction(async tx => {
    const [created] = await tx.insert(schema.users).values({
      email: input.email, name: input.name, jobTitle: input.jobTitle, department: input.department, role: platformRole,
    }).$returningId();
    if (organizationId) await tx.insert(schema.organizationMembers).values({ organizationId, userId: created!.id, role: orgRole });
    await audit({ actorId, action: 'user.created', entityType: 'user', entityId: created!.id, subjectUserId: created!.id, organizationId, metadata: { platformRole, orgRole: organizationId ? orgRole : null } }, tx);
    return created!.id;
  });
  await inviteUser(scope, actorId, userId);
  return userId;
}

async function requireManaged(scope: AdminScope, userId: number) {
  const [u] = await scopedUsers(scope, [userId]);
  if (!u || !canManageUser(scope, u)) throw new UserError('Learner not found.');
  return u;
}

/** (Re)send the set-password email. Returns the link (also logged to console when SMTP is not configured). */
export async function inviteUser(scope: AdminScope, actorId: number, userId: number) {
  const u = await requireManaged(scope, userId);
  if (u.status !== 'active') throw new UserError('Activate the account before sending an invite.');
  await sendPasswordLink(u, u.hasPassword ? 'reset' : 'invite');
  await audit({ actorId, action: 'user.invited', entityType: 'user', entityId: userId, subjectUserId: userId, organizationId: u.organizationId });
}

export async function updateUserDetails(scope: AdminScope, actorId: number, userId: number, input: { name: string; email: string; jobTitle: string | null; department: string | null }) {
  const u = await requireManaged(scope, userId);
  if (input.email !== u.email) {
    const [taken] = await db().select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, input.email)).limit(1);
    if (taken) throw new UserError('An account with this email already exists.', { email: 'An account with this email already exists.' });
  }
  await db().update(schema.users).set(input).where(eq(schema.users.id, userId));
  await audit({ actorId, action: 'user.updated', entityType: 'user', entityId: userId, subjectUserId: userId, organizationId: u.organizationId, metadata: { emailChanged: input.email !== u.email } });
}

export async function setUserStatus(scope: AdminScope, actorId: number, userId: number, status: 'active' | 'inactive') {
  if (userId === actorId) throw new UserError('You cannot change the status of your own account.');
  const u = await requireManaged(scope, userId);
  await db().update(schema.users).set({ status }).where(eq(schema.users.id, userId));
  if (status === 'inactive') await destroyUserSessions(userId);
  await audit({ actorId, action: 'user.status_changed', entityType: 'user', entityId: userId, subjectUserId: userId, organizationId: u.organizationId, metadata: { from: u.status, to: status } });
}

/**
 * Platform admins only: set a user's platform role and organization membership.
 * Existing assignments and attempts are kept (history is never rewritten).
 */
export async function setUserAccess(scope: AdminScope, actorId: number, userId: number, input: { platformRole: PlatformRole; organizationId: number | null; orgRole: OrgRole }) {
  if (!canChangeRoles(scope)) throw new UserError('Only platform admins can change roles or organization membership.');
  if (userId === actorId && input.platformRole !== 'platform_admin') throw new UserError('You cannot remove your own platform admin role.');
  if (input.platformRole === 'platform_admin' && input.organizationId) throw new UserError('Platform admins cannot belong to an organization.');
  const u = await requireManaged(scope, userId);
  await db().transaction(async tx => {
    await tx.update(schema.users).set({ role: input.platformRole }).where(eq(schema.users.id, userId));
    await tx.delete(schema.organizationMembers).where(eq(schema.organizationMembers.userId, userId));
    if (input.organizationId) await tx.insert(schema.organizationMembers).values({ organizationId: input.organizationId, userId, role: input.orgRole });
    await audit({
      actorId, action: 'user.role_changed', entityType: 'user', entityId: userId, subjectUserId: userId, organizationId: input.organizationId,
      metadata: { from: { role: u.role, organizationId: u.organizationId, orgRole: u.orgRole }, to: input },
    }, tx);
  });
}

/** Learners in scope, as options for enrollment pickers. */
export async function learnerOptions(scope: AdminScope) {
  const users = await scopedUsers(scope);
  return users.filter(u => u.status === 'active').map(u => ({ id: u.id, label: u.name, meta: [u.department, u.organizationName].filter(Boolean).join(' · ') || u.email }));
}
