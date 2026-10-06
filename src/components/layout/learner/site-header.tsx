'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Bell, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogoutButton } from '../logout-button';
import type { ShellUser } from '../shell-types';
import { isLearnerNavActive, learnerNavigation } from './navigation';
import type { LearnerDialog } from './app-shell-dialog';

export function SiteHeader({ user, hasNotifications, onOpenDialog }: { user: ShellUser; hasNotifications: boolean; onOpenDialog: (dialog: LearnerDialog) => void }) {
  const path = usePathname();
  const [menu, setMenu] = useState(false);

  return <header className="site-header">
    <div className="site-header-inner">
      <Link href="/" className="site-brand" aria-label="nuclearsafety.net home">
        <ShieldCheck size={26} strokeWidth={1.7} />
        <span>nuclearsafety<span className="font-normal opacity-80">.net</span></span>
      </Link>
      <nav className="site-nav" aria-label="Main navigation">
        {learnerNavigation.map(({ href, label }) => {
          const active = isLearnerNavActive(path, href);
          return <Link key={href} href={href} className={`site-nav-link ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined}>{label}</Link>;
        })}
      </nav>
      <div className="site-tools">
        <Button variant="ghost" size="icon" className="site-icon-btn notification-button" aria-label="Notifications" onClick={() => onOpenDialog('notifications')}><Bell size={18} />{hasNotifications && <span className="notification-dot" />}</Button>
        <Button variant="ghost" className="site-account" aria-label="Your profile" onClick={() => onOpenDialog('profile')}><span className="avatar">{user.initials}</span><span className="site-account-name">{user.name}</span></Button>
        <LogoutButton className="site-logout" />
        <Button variant="ghost" size="icon" className="site-icon-btn site-menu-btn" aria-label={menu ? 'Close navigation' : 'Open navigation'} aria-expanded={menu} onClick={() => setMenu(m => !m)}>{menu ? <X /> : <Menu />}</Button>
      </div>
    </div>
    {menu && <nav className="site-mobile-nav" aria-label="Mobile navigation">
      {learnerNavigation.map(({ href, label }) => (
        <Link key={href} href={href} className={`site-mobile-link ${isLearnerNavActive(path, href) ? 'is-active' : ''}`} onClick={() => setMenu(false)}>{label}</Link>
      ))}
      {user.isAdmin && <Link href="/admin" className="site-mobile-link" onClick={() => setMenu(false)}>Admin workspace</Link>}
      <LogoutButton className="site-mobile-link w-full justify-start" />
    </nav>}
  </header>;
}
