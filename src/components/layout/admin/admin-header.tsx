'use client';

import { usePathname } from 'next/navigation';
import { Bell, ChevronDown, ChevronRight, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ShellUser } from '../shell-types';
import { adminPageTitle } from './navigation';
import type { AdminDialog } from './admin-shell-dialog';

export function AdminHeader({ user, hasNotifications, onOpenMenu, onOpenDialog }: { user: ShellUser; hasNotifications: boolean; onOpenMenu: () => void; onOpenDialog: (dialog: AdminDialog) => void }) {
  const title = adminPageTitle(usePathname());

  return <header className="app-header">
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" className="mobile-menu" aria-label="Open navigation" onClick={onOpenMenu}><Menu /></Button>
      <span className="text-xs text-muted-foreground">Admin console</span>
      <ChevronRight size={13} className="text-muted-foreground" />
      <span className="text-xs font-medium">{title}</span>
    </div>
    <div className="header-tools">
      <Button variant="ghost" size="icon" aria-label="Notifications" title="Notifications" className="notification-button text-muted-foreground" onClick={() => onOpenDialog('notifications')}><Bell size={19} />{hasNotifications && <span className="notification-dot" />}</Button>
      <span className="header-divider" />
      <Button variant="ghost" className="h-auto px-0 gap-3" onClick={() => onOpenDialog('account')} aria-label="Your account"><span className="avatar">{user.initials}</span><span className="header-profile-name text-xs">{user.name}</span><ChevronDown size={13} /></Button>
    </div>
  </header>;
}
