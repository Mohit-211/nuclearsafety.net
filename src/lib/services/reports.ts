import 'server-only';
import type { AdminScope } from '@/lib/auth/policy';
import { daysUntil, formatDate, todayISO } from '@/lib/format';
import type { ReportRow } from '@/lib/types';
import { averageProgress, loadEnrollments, scopeFilter, summarize } from './enrollments';
import { listAdminCourses } from './catalogue';
import { activityFeed } from './people';

/** One row per active assignment in scope, built only from persisted data. */
export async function reportRows(scope: AdminScope): Promise<ReportRow[]> {
  const rows = await loadEnrollments(scopeFilter(scope));
  const today = todayISO();
  return rows.map(r => {
    const s = summarize(r);
    const when = s.completedAt ?? s.lastActivityAt ?? r.assignedAt;
    return {
      learner: r.userName, email: r.userEmail, department: r.userDepartment ?? '—', organization: r.organizationName ?? null,
      courseId: r.courseId, courseCode: r.courseCode, course: r.courseTitle,
      progress: s.progress, score: s.score, result: s.result, status: s.status,
      date: formatDate(when),
      daysAgo: Math.max(0, -daysUntil(todayISO(when), new Date(`${today}T12:00:00Z`))),
      due: r.dueDate ? formatDate(r.dueDate) : null,
      versionNumber: r.attempt?.versionNumber ?? null,
    };
  });
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  // Neutralise spreadsheet formula injection, then quote.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function reportCsv(rows: ReportRow[]): string {
  const header = ['Learner', 'Email', 'Department', 'Organization', 'Course code', 'Course', 'Status', 'Progress %', 'Score %', 'Result', 'Completion / last activity', 'Due date', 'Package version'];
  const lines = rows.map(r => [
    r.learner, r.email, r.department, r.organization ?? '', r.courseCode, r.course, r.status,
    r.progress ?? '', r.score ?? '', r.result ?? '', r.date, r.due ?? '', r.versionNumber ?? '',
  ].map(csvCell).join(','));
  return [header.map(csvCell).join(','), ...lines].join('\r\n');
}

export async function adminOverview(scope: AdminScope) {
  const [enrollments, courses, activity] = await Promise.all([
    loadEnrollments(scopeFilter(scope)),
    listAdminCourses(scope),
    activityFeed(scope, { limit: 8 }),
  ]);
  const summaries = enrollments.map(e => summarize(e));
  const completed = summaries.filter(s => s.status === 'Completed').length;
  return {
    totalLearners: new Set(enrollments.map(e => e.userId)).size,
    activeCourses: courses.filter(c => c.status === 'Published').length,
    completions: completed,
    completionRate: enrollments.length ? Math.round((completed / enrollments.length) * 100) : 0,
    overdue: summaries.filter(s => s.overdue).length,
    avgProgress: averageProgress(summaries.map(s => s.progress)),
    courses: courses.filter(c => c.status !== 'Archived'),
    activity,
  };
}
