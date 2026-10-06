/*
 * Central authorization policy. Pure functions only (no I/O) so they can be unit
 * tested; every server action / route handler / data-access function must use
 * these instead of ad-hoc role checks. Hiding UI is never the security boundary.
 */

export type PlatformRole = 'platform_admin' | 'learner';
export type OrgRole = 'member' | 'admin';

/** The signed-in user, as resolved from the session on the server. */
export type Principal = {
  id: number;
  email: string;
  name: string;
  role: PlatformRole;
  jobTitle: string | null;
  department: string | null;
  organizationId: number | null;
  organizationName: string | null;
  orgRole: OrgRole | null;
};

/** What an administrator may see/manage. */
export type AdminScope =
  | { kind: 'platform' }
  | { kind: 'organization'; organizationId: number; organizationName: string };

export const isPlatformAdmin = (p: Principal) => p.role === 'platform_admin';
export const isOrgAdmin = (p: Principal) => p.orgRole === 'admin' && p.organizationId !== null;

/** Admin scope for a principal, or null when they have no admin rights at all. */
export function adminScopeFor(p: Principal): AdminScope | null {
  if (isPlatformAdmin(p)) return { kind: 'platform' };
  if (isOrgAdmin(p)) return { kind: 'organization', organizationId: p.organizationId!, organizationName: p.organizationName ?? '' };
  return null;
}

/** Minimal facts about a user that management decisions depend on. */
export type ManagedUserFacts = { role: PlatformRole; organizationId: number | null };

/** May this admin scope view / manage this user? */
export function canManageUser(scope: AdminScope, target: ManagedUserFacts): boolean {
  if (scope.kind === 'platform') return true;
  return target.role !== 'platform_admin' && target.organizationId === scope.organizationId;
}

/** Only platform admins can change platform roles, org membership or org-admin status. */
export function canChangeRoles(scope: AdminScope): boolean {
  return scope.kind === 'platform';
}

/** Facts about a course needed to decide whether it can be assigned. */
export type AssignableCourseFacts = {
  status: 'draft' | 'published' | 'archived';
  hasActiveVersion: boolean;
  /** Organization ids that were granted access to the course. */
  grantedOrganizationIds: number[];
};

/**
 * May `scope` assign `course` to a learner whose organization is `learnerOrgId`?
 * - Course must be published with an active package version.
 * - Platform admins may assign to anyone.
 * - Corporate admins may assign only courses granted to their own organization,
 *   and only to members of that organization.
 */
export function canAssignCourse(scope: AdminScope, course: AssignableCourseFacts, learner: ManagedUserFacts): boolean {
  if (course.status !== 'published' || !course.hasActiveVersion) return false;
  if (!canManageUser(scope, learner)) return false;
  if (scope.kind === 'platform') return true;
  return course.grantedOrganizationIds.includes(scope.organizationId);
}

/** Platform-only capabilities (course uploads/versions, organizations, settings). */
export function canManageCatalogue(scope: AdminScope): boolean {
  return scope.kind === 'platform';
}
