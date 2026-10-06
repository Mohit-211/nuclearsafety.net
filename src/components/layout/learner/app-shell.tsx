'use client';

import { useState, type ReactNode } from 'react';
import type { ShellNotification, ShellSupport, ShellUser } from '../shell-types';
import { SiteHeader } from './site-header';
import { SiteFooter } from './site-footer';
import { AppShellDialog, type LearnerDialog } from './app-shell-dialog';

/** Learner website chrome: top navigation, footer and shared dialogs. */
export function AppShell({ user, notifications, support, children }: { user: ShellUser; notifications: ShellNotification[]; support: ShellSupport; children: ReactNode }) {
  const [dialog, setDialog] = useState<LearnerDialog | null>(null);

  return <div className="site-shell">
    <SiteHeader user={user} hasNotifications={notifications.length > 0} onOpenDialog={setDialog} />
    <main className="site-main">{children}</main>
    <SiteFooter isAdmin={user.isAdmin} onOpenDialog={setDialog} />
    <AppShellDialog dialog={dialog} user={user} notifications={notifications} support={support} onClose={() => setDialog(null)} />
  </div>;
}
