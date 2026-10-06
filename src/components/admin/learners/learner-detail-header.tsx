'use client';

import { useState } from 'react';
import { KeyRound, Mail, MoreHorizontal, Pencil, Power, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeading } from '@/components/shared/page-heading';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EnrollmentDialog, type EnrollItem } from '@/components/admin/dialogs/enrollment-dialog';
import { AccessDialog, UserFormDialog, type AccountType } from '@/components/admin/dialogs/user-form-dialog';
import { useAction } from '@/hooks/use-action';
import { inviteUserAction, saveLearnerEnrollmentAction, setUserStatusAction } from '@/lib/actions/admin';
import { initials, statusClass } from '@/lib/format';
import type { Option } from '@/lib/types';

export type LearnerHeaderData = {
  id: number; name: string; email: string; jobTitle: string; department: string; subtitle: string;
  statusLabel: string; active: boolean; hasPassword: boolean; accountType: AccountType; organizationId: number | null;
};

export function LearnerDetailHeader({ learner, enrolled, courseOptions, organizations, isPlatform, isSelf, defaultDueDate }: {
  learner: LearnerHeaderData; enrolled: EnrollItem[]; courseOptions: Option[]; organizations: Option[];
  isPlatform: boolean; isSelf: boolean; defaultDueDate: string | null;
}) {
  const [dialog, setDialog] = useState<'edit' | 'enroll' | 'access' | 'status' | null>(null);
  const [more, setMore] = useState(false);
  const invite = useAction(inviteUserAction);
  const status = useAction(setUserStatusAction);
  const close = (open: boolean) => { if (!open) setDialog(null); };

  return <>
    <PageHeading
      title={<div className="flex items-center gap-3 flex-wrap">
        <span className="avatar learner-avatar" aria-hidden="true">{initials(learner.name)}</span>
        <h1>{learner.name}</h1>
        <span className={`badge ${statusClass(learner.statusLabel)}`}>{learner.statusLabel}</span>
      </div>}
      subtitle={learner.subtitle}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" onClick={() => setDialog('edit')}><Pencil size={15} />Edit learner</Button>
        <Button onClick={() => setDialog('enroll')} disabled={!learner.active}><UserPlus size={15} />Manage enrollment</Button>
        <Button variant="outline" size="icon" aria-label="More actions" aria-expanded={more} onClick={() => setMore(m => !m)}><MoreHorizontal size={15} /></Button>
      </div>
    </PageHeading>

    {more && <div className="flex gap-2 flex-wrap -mt-3 mb-6" role="group" aria-label="More learner actions">
      {learner.active && <Button variant="outline" size="sm" disabled={invite.state === 'loading'} onClick={() => invite.run({ userId: learner.id })}>
        <Mail size={14} />{invite.state === 'success' ? 'Email sent' : learner.hasPassword ? 'Send password reset' : 'Resend invite'}</Button>}
      {isPlatform && <Button variant="outline" size="sm" onClick={() => setDialog('access')}><KeyRound size={14} />Account type & organization</Button>}
      {!isSelf && <Button variant="outline" size="sm" onClick={() => setDialog('status')}><Power size={14} />{learner.active ? 'Deactivate account' : 'Reactivate account'}</Button>}
      {(invite.error || status.error) && <p className="form-error self-center" role="alert">{invite.error || status.error}</p>}
    </div>}

    <UserFormDialog open={dialog === 'edit'} onOpenChange={close} mode="edit" userId={learner.id}
      initial={{ name: learner.name, email: learner.email, jobTitle: learner.jobTitle, department: learner.department }}
      organizations={organizations} canSetAccess={false} />
    {isPlatform && <AccessDialog open={dialog === 'access'} onOpenChange={close} userId={learner.id}
      current={{ type: learner.accountType, organizationId: learner.organizationId }} organizations={organizations} />}
    <EnrollmentDialog open={dialog === 'enroll'} onOpenChange={close} noun="course" subject={learner.name}
      enrolled={enrolled} available={courseOptions} defaultDueDate={defaultDueDate}
      save={diff => saveLearnerEnrollmentAction({ userId: learner.id, ...diff })} />
    <ConfirmDialog open={dialog === 'status'} onOpenChange={close} destructive={learner.active}
      title={learner.active ? `Deactivate ${learner.name}?` : `Reactivate ${learner.name}?`}
      description={learner.active ? 'They will be signed out and unable to sign in. Their training history is kept.' : 'They will be able to sign in again.'}
      confirmLabel={learner.active ? 'Deactivate' : 'Reactivate'}
      onConfirm={() => { void status.run({ userId: learner.id, status: learner.active ? 'inactive' : 'active' }); setDialog(null); }} />
  </>;
}
