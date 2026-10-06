import 'server-only';
import { adminScopeFor, type Principal } from '@/lib/auth/policy';
import { initials } from '@/lib/format';
import type { ShellNotification, ShellSupport, ShellUser } from '@/components/layout/shell-types';
import type { LearnerCourse } from '@/lib/types';
import { roleLabel } from './people';
import { getSettings } from './settings';

export function shellUser(p: Principal): ShellUser {
  return {
    name: p.name,
    email: p.email,
    initials: initials(p.name),
    roleLabel: roleLabel(p),
    isAdmin: adminScopeFor(p) !== null,
    organizationName: p.organizationName,
  };
}

export async function shellSupport(): Promise<ShellSupport> {
  const s = await getSettings();
  return { email: s.supportEmail, message: s.supportMessage };
}

/** Due-soon / overdue courses and recently completed ones (last 14 days). */
export function learnerNotifications(courses: LearnerCourse[]): ShellNotification[] {
  const due = courses
    .filter(c => c.status !== 'Completed' && c.daysUntilDue !== null && c.daysUntilDue <= 14)
    .sort((a, b) => a.daysUntilDue! - b.daysUntilDue!)
    .map(c => ({
      title: c.daysUntilDue! < 0 ? 'Training overdue' : 'Training due soon',
      detail: `${c.title} · ${c.due}`,
      tone: 'due' as const,
    }));
  const recent = courses
    .filter(c => c.status === 'Completed' && c.lastActivityAt && Date.now() - c.lastActivityAt < 14 * 86_400_000)
    .map(c => ({ title: 'Certificate available', detail: c.title, tone: 'done' as const }));
  return [...due, ...recent].slice(0, 6);
}
