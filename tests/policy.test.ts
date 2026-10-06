import { describe, expect, it } from 'vitest';
import { adminScopeFor, canAssignCourse, canChangeRoles, canManageCatalogue, canManageUser, type Principal } from '@/lib/auth/policy';

const principal = (over: Partial<Principal>): Principal => ({
  id: 1, email: 'a@b.c', name: 'A', role: 'learner', jobTitle: null, department: null,
  organizationId: null, organizationName: null, orgRole: null, ...over,
});

const platform = adminScopeFor(principal({ role: 'platform_admin' }))!;
const orgA = adminScopeFor(principal({ organizationId: 10, organizationName: 'A', orgRole: 'admin' }))!;
const published = { status: 'published' as const, hasActiveVersion: true, grantedOrganizationIds: [10] };

describe('adminScopeFor', () => {
  it('maps roles to scopes', () => {
    expect(platform).toEqual({ kind: 'platform' });
    expect(orgA).toEqual({ kind: 'organization', organizationId: 10, organizationName: 'A' });
    expect(adminScopeFor(principal({}))).toBeNull();
    expect(adminScopeFor(principal({ organizationId: 10, orgRole: 'member' }))).toBeNull();
  });
});

describe('role boundaries', () => {
  it('corporate admins manage only their own organization', () => {
    expect(canManageUser(orgA, { role: 'learner', organizationId: 10 })).toBe(true);
    expect(canManageUser(orgA, { role: 'learner', organizationId: 11 })).toBe(false);
    expect(canManageUser(orgA, { role: 'learner', organizationId: null })).toBe(false);
    expect(canManageUser(orgA, { role: 'platform_admin', organizationId: 10 })).toBe(false);
    expect(canManageUser(platform, { role: 'learner', organizationId: 11 })).toBe(true);
  });

  it('corporate admins cannot perform global admin actions', () => {
    expect(canManageCatalogue(orgA)).toBe(false);
    expect(canChangeRoles(orgA)).toBe(false);
    expect(canManageCatalogue(platform)).toBe(true);
  });

  it('course assignment requires access, a published course and an active version', () => {
    const member = { role: 'learner' as const, organizationId: 10 };
    expect(canAssignCourse(orgA, published, member)).toBe(true);
    expect(canAssignCourse(orgA, { ...published, grantedOrganizationIds: [] }, member)).toBe(false);
    expect(canAssignCourse(orgA, published, { role: 'learner', organizationId: 11 })).toBe(false);
    expect(canAssignCourse(orgA, { ...published, status: 'draft' }, member)).toBe(false);
    expect(canAssignCourse(platform, { ...published, hasActiveVersion: false }, member)).toBe(false);
    expect(canAssignCourse(platform, { ...published, grantedOrganizationIds: [] }, { role: 'learner', organizationId: null })).toBe(true);
  });
});
