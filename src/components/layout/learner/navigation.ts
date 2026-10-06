export const learnerNavigation = [
  { href: '/', label: 'Dashboard' },
  { href: '/my-training', label: 'My courses' },
  { href: '/profile', label: 'Profile' },
] as const;

export function isLearnerNavActive(path: string, href: string) {
  if (href === '/') return path === '/';
  if (href === '/my-training') return ['/my-training', '/courses', '/course-library'].some(p => path.startsWith(p));
  return path.startsWith(href);
}
