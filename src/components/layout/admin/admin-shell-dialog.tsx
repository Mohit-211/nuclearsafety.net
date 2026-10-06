'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { NotificationList, SupportText } from '../learner/app-shell-dialog';
import { LogoutButton } from '../logout-button';
import type { ShellNotification, ShellSupport, ShellUser } from '../shell-types';

export type AdminDialog = 'notifications' | 'help' | 'account';

const headings: Record<AdminDialog, [string, string]> = {
  notifications: ['Notifications', 'Items that need attention'],
  help: ['Help & support', 'Administrative support'],
  account: ['Your account', 'Signed-in administrator'],
};

export function AdminShellDialog({ dialog, user, notifications, support, onClose }: { dialog: AdminDialog | null; user: ShellUser; notifications: ShellNotification[]; support: ShellSupport; onClose: () => void }) {
  const [title, description] = headings[dialog ?? 'help'];
  return <Dialog open={!!dialog} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="modal-content">
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
      {dialog === 'notifications' ? <NotificationList items={notifications} />
        : dialog === 'account' ? <div className="space-y-4 py-3">
          <div className="flex gap-3 items-center"><span className="avatar">{user.initials}</span><div><p className="font-semibold">{user.name}</p><p className="text-muted-foreground text-xs">{user.email} · {user.roleLabel}</p></div></div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" asChild onClick={onClose}><Link href="/profile">Profile & password</Link></Button>
            <LogoutButton />
          </div>
        </div>
          : <SupportText support={support} />}
    </DialogContent>
  </Dialog>;
}
