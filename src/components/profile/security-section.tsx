'use client';

import { useState } from 'react';
import { Check, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AccountCard } from '@/components/shared/account-card';
import { PasswordToggle } from '@/components/shared/password-toggle';
import { useAction } from '@/hooks/use-action';
import { changePassword } from '@/lib/actions/auth';

/** Change-password card, used on the learner profile and admin settings pages. */
export function SecuritySection({ lastChanged, title = 'Security' }: { lastChanged: string | null; title?: string }) {
  const [show, setShow] = useState(false);
  const [values, setValues] = useState({ current: '', password: '', confirm: '' });
  const action = useAction(changePassword);
  const type = show ? 'text' : 'password';
  const busy = action.state === 'loading';

  const submit = async () => {
    const result = await action.run(values);
    if (result.ok) setValues({ current: '', password: '', confirm: '' });
  };
  const err = action.fieldErrors;

  return (
    <AccountCard icon={Lock} title={title} subtitle={`Change your password.${lastChanged ? ` Last updated ${lastChanged}.` : ''} Other signed-in devices will be signed out.`}
      action={<Button size="sm" onClick={submit} disabled={busy || !values.current || !values.password}>
        {busy ? <><Loader2 size={14} className="animate-spin" /> Updating…</> : action.state === 'success' ? <><Check size={14} /> Updated</> : 'Update password'}
      </Button>}>
      {action.error && !Object.keys(err).length && <p className="form-error mb-3" role="alert">{action.error}</p>}
      <div className="account-grid">
        <div className="account-field account-field-wide">
          <Label htmlFor="pw-current">Current password</Label>
          <Input id="pw-current" type={type} autoComplete="current-password" placeholder="Enter current password" value={values.current}
            onChange={e => setValues({ ...values, current: e.target.value })} aria-invalid={!!err.current} disabled={busy} />
          {err.current && <p className="form-error">{err.current}</p>}
        </div>
        <div className="account-field">
          <Label htmlFor="pw-new">New password</Label>
          <Input id="pw-new" type={type} autoComplete="new-password" placeholder="Minimum 10 characters" value={values.password}
            onChange={e => setValues({ ...values, password: e.target.value })} aria-invalid={!!err.password} disabled={busy} />
          {err.password && <p className="form-error">{err.password}</p>}
        </div>
        <div className="account-field pw-confirm">
          <Label htmlFor="pw-confirm">Confirm new password</Label>
          <div className="relative">
            <Input id="pw-confirm" type={type} autoComplete="new-password" placeholder="Repeat new password" className="pr-10" value={values.confirm}
              onChange={e => setValues({ ...values, confirm: e.target.value })} aria-invalid={!!err.confirm} disabled={busy} />
            <PasswordToggle shown={show} onToggle={() => setShow(s => !s)} plural />
          </div>
          {err.confirm && <p className="form-error">{err.confirm}</p>}
        </div>
      </div>
    </AccountCard>
  );
}
