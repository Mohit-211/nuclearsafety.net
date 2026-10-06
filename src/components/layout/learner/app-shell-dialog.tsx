'use client';

import Link from 'next/link';
import { Bell, CheckCircle2, CircleHelp, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { ShellNotification, ShellSupport, ShellUser } from '../shell-types';

export type LearnerDialog = 'notifications' | 'profile' | 'help' | 'privacy';

const headings: Record<LearnerDialog, [title: string, description: string]> = {
  notifications: ['Notifications', 'Your latest training updates'],
  profile: ['Your profile', 'Learner account details'],
  privacy: ['Privacy policy', 'How your training data is used'],
  help: ['Help & support', 'Training support'],
};

export function NotificationList({ items }: { items: ShellNotification[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground py-4">You are all caught up.</p>;
  return <>{items.map((n, i) => <div className="resource-row" key={`${n.title}-${i}`}>
    {n.tone === 'done' ? <CheckCircle2 size={20} className="text-success shrink-0" /> : n.tone === 'due' ? <Bell size={20} className="text-warning shrink-0" /> : <Info size={20} className="shrink-0" />}
    <div><h2>{n.title}</h2><p>{n.detail}</p></div>
  </div>)}</>;
}

export function SupportText({ support }: { support: ShellSupport }) {
  return <p className="text-sm text-muted-foreground leading-7 flex gap-2">
    <CircleHelp size={16} className="shrink-0 mt-1" />
    <span>{support.message}{support.email && <> Email <a className="text-primary underline" href={`mailto:${support.email}`}>{support.email}</a>.</>}</span>
  </p>;
}

export function AppShellDialog({ dialog, user, notifications, support, onClose }: { dialog: LearnerDialog | null; user: ShellUser; notifications: ShellNotification[]; support: ShellSupport; onClose: () => void }) {
  const [title, description] = headings[dialog ?? 'help'];
  return <Dialog open={!!dialog} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="modal-content">
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
      {dialog === 'notifications' ? <NotificationList items={notifications} />
        : dialog === 'profile' ? <div className="space-y-4 py-3">
          <div className="flex gap-3 items-center"><span className="avatar">{user.initials}</span><div><p className="font-semibold">{user.name}</p><p className="text-muted-foreground text-xs">{user.roleLabel}{user.organizationName ? ` · ${user.organizationName}` : ''}</p></div></div>
          <Button variant="outline" asChild onClick={onClose}><Link href="/profile">View profile</Link></Button>
        </div>
          : dialog === 'privacy'
            ? <p className="text-sm text-muted-foreground leading-7">We store your account details and your training progress (course status, scores, time spent and resume data) to deliver and report on your assigned training. Your progress is visible to you, to your organization’s training administrators and to platform administrators.</p>
            : <SupportText support={support} />}
    </DialogContent>
  </Dialog>;
}
