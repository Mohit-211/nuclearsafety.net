'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAction } from '@/hooks/use-action';
import { resetPassword } from '@/lib/actions/auth';

/** Sets a new password from a reset or invite link. */
export function ResetPasswordForm({ token, invite }: { token: string; invite: boolean }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const action = useAction(resetPassword, { refresh: false });

  if (action.state === 'success') {
    return <div role="status">
      <span className="dialog-success-icon"><CheckCircle2 size={26} /></span>
      <div className="login-form-heading">
        <h2>Password saved</h2>
        <p>You can now sign in with your new password.</p>
      </div>
      <Button asChild size="lg" className="w-full mt-6"><Link href="/login">Sign in</Link></Button>
    </div>;
  }

  const busy = action.state === 'loading';
  return <>
    <div className="login-form-heading">
      <h2>{invite ? 'Set up your account' : 'Choose a new password'}</h2>
      <p>Use at least 10 characters. A passphrase of a few words works well.</p>
    </div>
    <form onSubmit={e => { e.preventDefault(); void action.run({ token, password, confirm }); }} noValidate>
      {action.error && !action.fieldErrors.password && !action.fieldErrors.confirm && <p className="form-error mb-4" role="alert">{action.error}</p>}
      <div className="login-field">
        <label htmlFor="new-password">New password</label>
        <input id="new-password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)}
          disabled={busy} className={action.fieldErrors.password ? 'is-invalid' : ''} aria-invalid={!!action.fieldErrors.password} />
        {action.fieldErrors.password && <p className="form-error">{action.fieldErrors.password}</p>}
      </div>
      <div className="login-field">
        <label htmlFor="confirm-password">Confirm password</label>
        <input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)}
          disabled={busy} className={action.fieldErrors.confirm ? 'is-invalid' : ''} aria-invalid={!!action.fieldErrors.confirm} />
        {action.fieldErrors.confirm && <p className="form-error">{action.fieldErrors.confirm}</p>}
      </div>
      <Button type="submit" size="lg" className="login-submit w-full" disabled={busy}>
        {busy ? <><Loader2 className="animate-spin" />Saving…</> : invite ? 'Create password' : 'Save new password'}
      </Button>
    </form>
  </>;
}
