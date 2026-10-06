import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { adminScopeFor, canManageCatalogue, type AdminScope, type Principal } from './policy';
import { sessionToken, userIdForToken } from './session';

/** Load the principal (user + organization membership) for a user id. Inactive users resolve to null. */
export async function loadPrincipal(userId: number): Promise<Principal | null> {
  const [row] = await db()
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      role: schema.users.role,
      status: schema.users.status,
      jobTitle: schema.users.jobTitle,
      department: schema.users.department,
      organizationId: schema.organizationMembers.organizationId,
      orgRole: schema.organizationMembers.role,
      organizationName: schema.organizations.name,
      organizationStatus: schema.organizations.status,
    })
    .from(schema.users)
    .leftJoin(schema.organizationMembers, eq(schema.organizationMembers.userId, schema.users.id))
    .leftJoin(schema.organizations, eq(schema.organizations.id, schema.organizationMembers.organizationId))
    .where(eq(schema.users.id, userId))
    .limit(1);
  if (!row || row.status !== 'active') return null;
  // Members of a deactivated organization lose access, except platform admins.
  if (row.organizationId && row.organizationStatus !== 'active' && row.role !== 'platform_admin') return null;
  return {
    id: row.id, email: row.email, name: row.name, role: row.role,
    jobTitle: row.jobTitle, department: row.department,
    organizationId: row.organizationId ?? null, organizationName: row.organizationName ?? null,
    orgRole: row.orgRole ?? null,
  };
}

/** The signed-in principal for this request (memoised per request), or null. */
export const getCurrentUser = cache(async (): Promise<Principal | null> => {
  const token = await sessionToken();
  if (!token) return null;
  const userId = await userIdForToken(token);
  return userId ? loadPrincipal(userId) : null;
});

/** For pages/layouts: redirect to the login page when signed out. */
export async function requireUser(): Promise<Principal> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/** For admin pages: platform admin or corporate admin. Others are sent to their dashboard. */
export async function requireAdmin(): Promise<{ user: Principal; scope: AdminScope }> {
  const user = await requireUser();
  const scope = adminScopeFor(user);
  if (!scope) redirect('/');
  return { user, scope };
}

/** For platform-only admin pages. */
export async function requirePlatformAdmin(): Promise<{ user: Principal; scope: AdminScope }> {
  const result = await requireAdmin();
  if (!canManageCatalogue(result.scope)) redirect('/admin');
  return result;
}

/** Thrown by actions/route handlers when the caller is not allowed. */
export class AuthError extends Error {
  constructor(public status: 401 | 403 | 404, message = status === 401 ? 'Please sign in.' : 'You do not have permission to do that.') {
    super(message);
  }
}

/** Non-redirecting variants for Server Actions and Route Handlers. */
export async function assertUser(): Promise<Principal> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError(401);
  return user;
}

export async function assertAdmin(): Promise<{ user: Principal; scope: AdminScope }> {
  const user = await assertUser();
  const scope = adminScopeFor(user);
  if (!scope) throw new AuthError(403);
  return { user, scope };
}

export async function assertPlatformAdmin(): Promise<{ user: Principal; scope: AdminScope }> {
  const result = await assertAdmin();
  if (!canManageCatalogue(result.scope)) throw new AuthError(403);
  return result;
}
