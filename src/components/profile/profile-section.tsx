'use client';

import { useState } from 'react';
import { Check, Loader2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AccountCard } from '@/components/shared/account-card';
import { useAction } from '@/hooks/use-action';
import { updateOwnProfile } from '@/lib/actions/auth';

export type ProfileValues = { name: string; email: string; jobTitle: string; department: string; organisation: string };

export function ProfileSection({ initial }: { initial: ProfileValues }) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(initial);
  const action = useAction(updateOwnProfile);

  const save = async () => {
    const result = await action.run({ name: values.name, jobTitle: values.jobTitle, department: values.department });
    if (result.ok) setEditing(false);
  };
  const busy = action.state === 'loading';

  const actionButtons = editing ? (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" disabled={busy} onClick={() => { setValues(initial); setEditing(false); action.reset(); }}>Cancel</Button>
      <Button size="sm" onClick={save} disabled={busy}>{busy ? <><Loader2 size={14} className="animate-spin" />Saving…</> : 'Save changes'}</Button>
    </div>
  ) : (
    <Button variant="outline" size="sm" onClick={() => { setEditing(true); action.reset(); }}>{action.state === 'success' ? <><Check size={14} /> Saved</> : 'Edit'}</Button>
  );

  return (
    <AccountCard icon={UserRound} title="Profile information" subtitle="Your name and work details. Your email and organisation are managed by your administrator." action={actionButtons}>
      {action.error && <p className="form-error mb-3" role="alert">{action.error}</p>}
      <div className="account-grid">
        <div className="account-field">
          <Label htmlFor="pf-name">Full name</Label>
          <Input id="pf-name" value={values.name} disabled={!editing || busy} onChange={e => setValues({ ...values, name: e.target.value })} />
        </div>
        <div className="account-field">
          <Label htmlFor="pf-email">Email</Label>
          <Input id="pf-email" type="email" value={values.email} disabled readOnly />
        </div>
        <div className="account-field">
          <Label htmlFor="pf-title">Job title</Label>
          <Input id="pf-title" value={values.jobTitle} disabled={!editing || busy} onChange={e => setValues({ ...values, jobTitle: e.target.value })} />
        </div>
        <div className="account-field">
          <Label htmlFor="pf-dept">Department</Label>
          <Input id="pf-dept" value={values.department} disabled={!editing || busy} onChange={e => setValues({ ...values, department: e.target.value })} />
        </div>
        <div className="account-field account-field-wide">
          <Label htmlFor="pf-org">Organisation</Label>
          <Input id="pf-org" value={values.organisation || 'Individual account'} disabled readOnly />
        </div>
      </div>
    </AccountCard>
  );
}
