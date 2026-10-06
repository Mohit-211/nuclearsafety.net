import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/db';
import { audit } from '@/lib/audit';
import { formatDate } from '@/lib/format';
import { UserError } from '@/lib/actions/result';
import { courseStatusLabel } from './catalogue';
import { loadEnrollments, summarize } from './enrollments';
import { listLearners } from './people';

export async function grantedCourseIdsByCourse(courseIds: number[]) {
  const map = new Map<number, number[]>();
  if (!courseIds.length) return map;
  const rows = await db().select().from(schema.organizationCourses).where(inArray(schema.organizationCourses.courseId, courseIds));
  for (const r of rows) map.set(r.courseId, [...(map.get(r.courseId) ?? []), r.organizationId]);
  return map;
}

export type OrganizationRow = {
  id: number; name: string; status: 'Active' | 'Inactive'; members: number; admins: number; courses: number;
  completionRate: number; createdOn: string;
};

export async function listOrganizations(): Promise<OrganizationRow[]> {
  const orgs = await db().select().from(schema.organizations).orderBy(schema.organizations.name);
  const members = await db().select({ organizationId: schema.organizationMembers.organizationId, role: schema.organizationMembers.role }).from(schema.organizationMembers);
  const grants = await db().select({ organizationId: schema.organizationCourses.organizationId }).from(schema.organizationCourses);
  const enrollments = await loadEnrollments({});
  return orgs.map(o => {
    const mine = enrollments.filter(e => e.organizationId === o.id).map(e => summarize(e));
    return {
      id: o.id, name: o.name, status: o.status === 'active' ? 'Active' : 'Inactive',
      members: members.filter(m => m.organizationId === o.id).length,
      admins: members.filter(m => m.organizationId === o.id && m.role === 'admin').length,
      courses: grants.filter(g => g.organizationId === o.id).length,
      completionRate: mine.length ? Math.round((mine.filter(s => s.status === 'Completed').length / mine.length) * 100) : 0,
      createdOn: formatDate(o.createdAt),
    };
  });
}

export async function getOrganization(organizationId: number) {
  const [org] = await db().select().from(schema.organizations).where(eq(schema.organizations.id, organizationId));
  if (!org) return null;
  const scope = { kind: 'organization' as const, organizationId, organizationName: org.name };
  const members = await listLearners(scope);
  const courseRows = await db()
    .select({ id: schema.courses.id, code: schema.courses.code, title: schema.courses.title, status: schema.courses.status, grantedAt: schema.organizationCourses.createdAt })
    .from(schema.organizationCourses)
    .innerJoin(schema.courses, eq(schema.courses.id, schema.organizationCourses.courseId))
    .where(eq(schema.organizationCourses.organizationId, organizationId))
    .orderBy(schema.courses.title);
  const allCourses = await db().select({ id: schema.courses.id, code: schema.courses.code, title: schema.courses.title, status: schema.courses.status })
    .from(schema.courses).orderBy(schema.courses.title);
  return {
    organization: org,
    members,
    courses: courseRows.map(c => ({ ...c, statusLabel: courseStatusLabel(c.status), grantedOn: formatDate(c.grantedAt) })),
    availableCourses: allCourses.filter(c => c.status !== 'archived' && !courseRows.some(g => g.id === c.id)),
  };
}

export async function createOrganization(actorId: number, name: string) {
  const [existing] = await db().select({ id: schema.organizations.id }).from(schema.organizations).where(eq(schema.organizations.name, name));
  if (existing) throw new UserError('An organization with this name already exists.', { name: 'An organization with this name already exists.' });
  const [created] = await db().insert(schema.organizations).values({ name, createdBy: actorId }).$returningId();
  await audit({ actorId, action: 'organization.created', entityType: 'organization', entityId: created!.id, organizationId: created!.id, metadata: { name } });
  return created!.id;
}

export async function updateOrganization(actorId: number, organizationId: number, input: { name: string; status: 'active' | 'inactive' }) {
  const [clash] = await db().select({ id: schema.organizations.id }).from(schema.organizations).where(eq(schema.organizations.name, input.name));
  if (clash && clash.id !== organizationId) throw new UserError('An organization with this name already exists.', { name: 'An organization with this name already exists.' });
  const res = await db().update(schema.organizations).set(input).where(eq(schema.organizations.id, organizationId));
  if (res[0].affectedRows === 0) throw new UserError('Organization not found.');
  await audit({ actorId, action: 'organization.updated', entityType: 'organization', entityId: organizationId, organizationId, metadata: input });
}

/**
 * Grant/revoke an organization's access to a course. Revoking stops NEW assignments
 * by corporate admins; existing assignments and attempts are kept.
 */
export async function setCourseAccess(actorId: number, organizationId: number, courseId: number, granted: boolean) {
  const [org] = await db().select({ id: schema.organizations.id }).from(schema.organizations).where(eq(schema.organizations.id, organizationId));
  const [course] = await db().select({ id: schema.courses.id }).from(schema.courses).where(eq(schema.courses.id, courseId));
  if (!org || !course) throw new UserError('Organization or course not found.');
  if (granted) {
    await db().insert(schema.organizationCourses).values({ organizationId, courseId, grantedBy: actorId }).onDuplicateKeyUpdate({ set: { organizationId } });
  } else {
    await db().delete(schema.organizationCourses).where(and(eq(schema.organizationCourses.organizationId, organizationId), eq(schema.organizationCourses.courseId, courseId)));
  }
  await audit({ actorId, action: granted ? 'organization.course_granted' : 'organization.course_revoked', entityType: 'organization', entityId: organizationId, organizationId, courseId });
}

export async function organizationOptions() {
  const rows = await db().select({ id: schema.organizations.id, name: schema.organizations.name, status: schema.organizations.status }).from(schema.organizations).orderBy(schema.organizations.name);
  return rows.filter(r => r.status === 'active').map(r => ({ id: r.id, label: r.name }));
}
