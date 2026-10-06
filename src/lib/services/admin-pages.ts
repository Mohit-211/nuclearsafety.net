import 'server-only';
import type { AdminScope } from '@/lib/auth/policy';
import type { Option } from '@/lib/types';
import { loadEnrollments, scopeFilter } from './enrollments';
import { getSettings } from './settings';

/** Shared data for enrollment dialogs on admin pages. */

/** Current enrollments in scope, grouped by course (learner options) and by learner (course options). */
export async function enrollmentMaps(scope: AdminScope) {
  const rows = await loadEnrollments(scopeFilter(scope));
  const byCourse: Record<number, Option[]> = {};
  const byUser: Record<number, Option[]> = {};
  for (const r of rows) {
    (byCourse[r.courseId] ??= []).push({ id: r.userId, label: r.userName, meta: [r.userDepartment, r.organizationName].filter(Boolean).join(' · ') || r.userEmail });
    (byUser[r.userId] ??= []).push({ id: r.courseId, label: r.courseTitle, meta: r.courseCode });
  }
  return { byCourse, byUser };
}

/** Suggested due date (YYYY-MM-DD) for new assignments, from platform settings. */
export async function defaultDueDate(): Promise<string | null> {
  const { defaultDueDays } = await getSettings();
  if (!defaultDueDays) return null;
  const d = new Date(Date.now() + defaultDueDays * 86_400_000);
  return d.toISOString().slice(0, 10);
}
