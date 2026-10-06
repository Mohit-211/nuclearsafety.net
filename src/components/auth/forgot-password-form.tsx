'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAction } from '@/hooks/use-action';
import { requestPasswordReset } from '@/lib/actions/auth';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const action = useAction(requestPasswordReset, { refresh: false });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('Enter a valid email address.'); return; }
    setError('');
    await action.run({ email });
  };

  if (action.state === 'success') {
    return <div role="status">
      <span className="dialog-success-icon"><MailCheck size={26} /></span>
      <div className="login-form-heading">
        <h2>Check your email</h2>
        <p>If an account exists for <strong>{email}</strong>, a reset link has been sent. The link expires in 2 hours.</p>
      </div>
      <Button asChild size="lg" className="w-full mt-6"><Link href="/login">Return to sign in</Link></Button>
      <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => action.reset()}>Use a different email</Button>
    </div>;
  }

  const shownError = error || action.error;
  return <>
    <div className="login-form-heading">
      <h2>Reset your password</h2>
      <p>Enter your account email and we’ll send you a reset link.</p>
    </div>
    <form onSubmit={submit} noValidate>
      <div className="login-field">
        <label htmlFor="reset-email">Email</label>
        <input id="reset-email" type="email" autoComplete="email" placeholder="name@company.com" value={email}
          onChange={e => setEmail(e.target.value)} disabled={action.state === 'loading'}
          className={shownError ? 'is-invalid' : ''} aria-invalid={!!shownError} aria-describedby={shownError ? 'reset-err' : undefined} />
        {shownError && <p id="reset-err" className="form-error">{shownError}</p>}
      </div>
      <Button type="submit" size="lg" className="login-submit w-full" disabled={action.state === 'loading'}>
        {action.state === 'loading' ? <><Loader2 className="animate-spin" />Sending…</> : 'Send reset link'}
      </Button>
    </form>
    <Link href="/login" className="text-link inline-flex items-center gap-1.5 mt-6 text-xs"><ArrowLeft size={13} />Back to sign in</Link>
  </>;
}
