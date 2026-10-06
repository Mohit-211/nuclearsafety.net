'use client';

import { useState, type ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { ShellNotification, ShellSupport, ShellUser } from '../shell-types';
import { AdminSidebar } from './admin-sidebar';
import { AdminHeader } from './admin-header';
import { AdminShellDialog, type AdminDialog } from './admin-shell-dialog';
import type { AdminNavKey } from './navigation';

export type AdminShellProps = {
  user: ShellUser;
  /** "Administration" for platform admins, the organization name for corporate admins. */
  scopeLabel: string;
  nav: AdminNavKey[];
  counts: Partial<Record<AdminNavKey, number>>;
  notifications: ShellNotification[];
  support: ShellSupport;
};

/** Admin console chrome: sidebar navigation, header and shared dialogs. */
export function AdminShell({ children, ...shell }: AdminShellProps & { children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const [dialog, setDialog] = useState<AdminDialog | null>(null);

  return <>
    <AdminSidebar {...shell} open={menu} onClose={() => setMenu(false)} onHelp={() => setDialog('help')} />
    <div className="app-main">
      <AdminHeader user={shell.user} hasNotifications={shell.notifications.length > 0} onOpenMenu={() => setMenu(true)} onOpenDialog={setDialog} />
      <div className="page-content">
        {children}
        <footer className="app-footer">
          <span>© {new Date().getFullYear()} nuclearsafety.net. All rights reserved.</span>
          <div className="flex items-center gap-5"><span className="flex gap-1.5 items-center"><ShieldCheck size={12} /> Nuclear safety training</span></div>
        </footer>
      </div>
    </div>
    <AdminShellDialog dialog={dialog} user={shell.user} notifications={shell.notifications} support={shell.support} onClose={() => setDialog(null)} />
  </>;
}
