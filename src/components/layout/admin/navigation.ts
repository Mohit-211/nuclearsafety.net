import { LayoutDashboard, BookOpen, Users, BarChart3, Settings, Building2, type LucideIcon } from 'lucide-react';

export type AdminNavKey = 'dashboard' | 'courses' | 'learners' | 'organizations' | 'reports' | 'settings';

export type AdminNavItem = { key: AdminNavKey; href: string; label: string; icon: LucideIcon; platformOnly?: boolean };

export const adminNavigation: AdminNavItem[] = [
  { key: 'dashboard', href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'courses', href: '/admin/courses', label: 'Courses', icon: BookOpen },
  { key: 'learners', href: '/admin/learners', label: 'Learners', icon: Users },
  { key: 'organizations', href: '/admin/organizations', label: 'Organizations', icon: Building2, platformOnly: true },
  { key: 'reports', href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { key: 'settings', href: '/admin/settings', label: 'Settings', icon: Settings, platformOnly: true },
];

export function isAdminNavActive(path: string, href: string) {
  return href === '/admin' ? path === '/admin' || path === '/admin/' : path.startsWith(href);
}

/** Breadcrumb title shown in the admin header for the current path. */
export function adminPageTitle(path: string) {
  if (/^\/admin\/courses\/[^/]+/.test(path)) return 'Course detail';
  if (/^\/admin\/learners\/[^/]+/.test(path)) return 'Learner detail';
  if (/^\/admin\/organizations\/[^/]+/.test(path)) return 'Organization detail';
  return adminNavigation.find(item => isAdminNavActive(path, item.href))?.label ?? 'Dashboard';
}
