'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertAdmin, assertPlatformAdmin } from '@/lib/auth/current-user';
import { activateVersion, setCourseStatus, updateCourseMetadata } from '@/lib/services/catalogue';
import { applyAssignmentChanges, updateDueDate } from '@/lib/services/assignments';
import { createUser, inviteUser, setUserAccess, setUserStatus, updateUserDetails } from '@/lib/services/people';
import { createOrganization, setCourseAccess, updateOrganization } from '@/lib/services/organizations';
import { saveSettings, settingsSchema } from '@/lib/services/settings';
import { decideRetake } from '@/lib/services/retakes';
import { runAction, zEmail, zId, zName, zOptionalText, type ActionResult } from './result';

/*
 * Admin Server Actions. Each one re-checks authentication + scope; ids from the
 * browser are only hints that the services re-validate against the database.
 * See docs/ENDPOINTS.md for the inventory.
 */

const done = () => { revalidatePath('/', 'layout'); return undefined; };
const zDueDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date.').nullable().optional().transform(v => v ?? null);
const zIds = z.array(zId).max(1000);

// ---- Courses (platform admins) ------------------------------------------------

const courseSchema = z.object({
  courseId: zId,
  code: z.string().trim().min(1, 'Enter a course code.').max(40).regex(/^[A-Za-z0-9._-]+$/, 'Use letters, numbers, dots, dashes or underscores.'),
  title: z.string().trim().min(1, 'Enter a course title.').max(255),
  description: zOptionalText(5000),
  category: zOptionalText(120),
  estimatedDuration: zOptionalText(40),
  isMandatory: z.boolean(),
});

export async function updateCourseAction(input: z.input<typeof courseSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const { user } = await assertPlatformAdmin();
    const { courseId, ...v } = courseSchema.parse(input);
    await updateCourseMetadata(user.id, courseId, { ...v, description: v.description ?? null, category: v.category ?? null, estimatedDuration: v.estimatedDuration ?? null });
    return done();
  });
}

export async function setCourseStatusAction(input: { courseId: number; status: 'draft' | 'published' | 'archived' }): Promise<ActionResult> {
  return runAction(async () => {
    const { user } = await assertPlatformAdmin();
    const v = z.object({ courseId: zId, status: z.enum(['draft', 'published', 'archived']) }).parse(input);
    await setCourseStatus(user.id, v.courseId, v.status);
    return done();
  });
}

export async function activateVersionAction(input: { courseId: number; versionId: number }): Promise<ActionResult> {
  return runAction(async () => {
    const { user } = await assertPlatformAdmin();
    const v = z.object({ courseId: zId, versionId: zId }).parse(input);
    await activateVersion(user.id, v.courseId, v.versionId);
    return done();
  });
}

// ---- Enrollment (platform + corporate admins, scoped) ---------------------------

export async function saveCourseEnrollmentAction(input: { courseId: number; add: number[]; remove: number[]; dueDate?: string | null }): Promise<ActionResult> {
  return runAction(async () => {
    const { user, scope } = await assertAdmin();
    const v = z.object({ courseId: zId, add: zIds, remove: zIds, dueDate: zDueDate }).parse(input);
    await applyAssignmentChanges(scope, user.id, {
      add: v.add.map(userId => ({ userId, courseId: v.courseId })),
      remove: v.remove.map(userId => ({ userId, courseId: v.courseId })),
      dueDate: v.dueDate,
    });
    return done();
  });
}

export async function saveLearnerEnrollmentAction(input: { userId: number; add: number[]; remove: number[]; dueDate?: string | null }): Promise<ActionResult> {
  return runAction(async () => {
    const { user, scope } = await assertAdmin();
    const v = z.object({ userId: zId, add: zIds, remove: zIds, dueDate: zDueDate }).parse(input);
    await applyAssignmentChanges(scope, user.id, {
      add: v.add.map(courseId => ({ userId: v.userId, courseId })),
      remove: v.remove.map(courseId => ({ userId: v.userId, courseId })),
      dueDate: v.dueDate,
    });
    return done();
  });
}

export async function updateDueDateAction(input: { userId: number; courseId: number; dueDate: string | null }): Promise<ActionResult> {
  return runAction(async () => {
    const { user, scope } = await assertAdmin();
    const v = z.object({ userId: zId, courseId: zId, dueDate: zDueDate }).parse(input);
    await updateDueDate(scope, user.id, { userId: v.userId, courseId: v.courseId }, v.dueDate);
    return done();
  });
}

// ---- Retake requests (platform + corporate admins, scoped) -----------------------

export async function decideRetakeAction(input: { requestId: number; approve: boolean; note?: string }): Promise<ActionResult> {
  return runAction(async () => {
    const { user, scope } = await assertAdmin();
    const v = z.object({ requestId: zId, approve: z.boolean(), note: z.string().trim().max(500).optional() }).parse(input);
    await decideRetake(scope, user.id, v.requestId, v.approve, v.note || null);
    return done();
  });
}

// ---- Users -------------------------------------------------------------------

const userSchema = z.object({
  name: zName,
  email: zEmail,
  jobTitle: zOptionalText(160),
  department: zOptionalText(160),
});

const createUserSchema = userSchema.extend({
  organizationId: zId.nullable().optional().transform(v => v ?? null),
  orgRole: z.enum(['member', 'admin']).default('member'),
  platformRole: z.enum(['platform_admin', 'learner']).default('learner'),
});

export async function createUserAction(input: z.input<typeof createUserSchema>): Promise<ActionResult<{ userId: number }>> {
  return runAction(async () => {
    const { user, scope } = await assertAdmin();
    const v = createUserSchema.parse(input);
    const userId = await createUser(scope, user.id, { ...v, jobTitle: v.jobTitle ?? null, department: v.department ?? null });
    revalidatePath('/', 'layout');
    return { userId };
  });
}

export async function updateUserAction(input: z.input<typeof userSchema> & { userId: number }): Promise<ActionResult> {
  return runAction(async () => {
    const { user, scope } = await assertAdmin();
    const { userId, ...v } = userSchema.extend({ userId: zId }).parse(input);
    await updateUserDetails(scope, user.id, userId, { ...v, jobTitle: v.jobTitle ?? null, department: v.department ?? null });
    return done();
  });
}

export async function setUserStatusAction(input: { userId: number; status: 'active' | 'inactive' }): Promise<ActionResult> {
  return runAction(async () => {
    const { user, scope } = await assertAdmin();
    const v = z.object({ userId: zId, status: z.enum(['active', 'inactive']) }).parse(input);
    await setUserStatus(scope, user.id, v.userId, v.status);
    return done();
  });
}

export async function setUserAccessAction(input: { userId: number; platformRole: 'platform_admin' | 'learner'; organizationId: number | null; orgRole: 'member' | 'admin' }): Promise<ActionResult> {
  return runAction(async () => {
    const { user, scope } = await assertPlatformAdmin();
    const v = z.object({
      userId: zId, platformRole: z.enum(['platform_admin', 'learner']),
      organizationId: zId.nullable(), orgRole: z.enum(['member', 'admin']),
    }).parse(input);
    await setUserAccess(scope, user.id, v.userId, v);
    return done();
  });
}

export async function inviteUserAction(input: { userId: number }): Promise<ActionResult> {
  return runAction(async () => {
    const { user, scope } = await assertAdmin();
    await inviteUser(scope, user.id, zId.parse(input.userId));
    return done();
  });
}

// ---- Organizations (platform admins) ------------------------------------------

const orgName = z.string().trim().min(1, 'Enter an organization name.').max(200);

export async function createOrganizationAction(input: { name: string }): Promise<ActionResult<{ organizationId: number }>> {
  return runAction(async () => {
    const { user } = await assertPlatformAdmin();
    const organizationId = await createOrganization(user.id, orgName.parse(input.name));
    revalidatePath('/', 'layout');
    return { organizationId };
  });
}

export async function updateOrganizationAction(input: { organizationId: number; name: string; status: 'active' | 'inactive' }): Promise<ActionResult> {
  return runAction(async () => {
    const { user } = await assertPlatformAdmin();
    const v = z.object({ organizationId: zId, name: orgName, status: z.enum(['active', 'inactive']) }).parse(input);
    await updateOrganization(user.id, v.organizationId, { name: v.name, status: v.status });
    return done();
  });
}

export async function setCourseAccessAction(input: { organizationId: number; courseId: number; granted: boolean }): Promise<ActionResult> {
  return runAction(async () => {
    const { user } = await assertPlatformAdmin();
    const v = z.object({ organizationId: zId, courseId: zId, granted: z.boolean() }).parse(input);
    await setCourseAccess(user.id, v.organizationId, v.courseId, v.granted);
    return done();
  });
}

// ---- Settings (platform admins) -------------------------------------------------

export async function saveSettingsAction(input: z.input<typeof settingsSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const { user } = await assertPlatformAdmin();
    await saveSettings(user.id, settingsSchema.partial().parse(input));
    return done();
  });
}
