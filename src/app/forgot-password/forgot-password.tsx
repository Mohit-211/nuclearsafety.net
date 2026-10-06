import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowLeft, Loader2, MailCheck, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/forgot-password')({
  head: () => ({
    meta: [
      { title: 'Reset password | nuclearsafety.net' },
      { name: 'description', content: 'Request a password reset link for your training account.' },
      { property: 'og:title', content: 'Reset password | nuclearsafety.net' },
      { property: 'og:description', content: 'Request a password reset link for your nuclear safety training account.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent'>('idle');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('Enter a valid email address.'); return; }
    setError(''); setStatus('loading');
    setTimeout(() => setStatus('sent'), 1100);
  };

  return <div className="login-page">
    <section className="login-panel" aria-hidden="true">
      <span className="login-brand">
        <span className="login-brand-mark"><ShieldCheck size={34} strokeWidth={1.6} /></span>
        <span className="login-brand-name">nuclearsafety<span className="login-brand-soft">.net</span><small>LEARNING MANAGEMENT</small></span>
      </span>
      <div className="login-panel-body">
        <h1>Nuclear safety training for your entire workforce.</h1>
        <p>Structured courses, clear progress tracking and certificates — all in one workspace.</p>
      </div>
      <p className="login-panel-foot">© 2026 nuclearsafety.net</p>
    </section>

    <section className="login-form-side">
      <div className="login-form-wrap">
        {status === 'sent' ? <div role="status">
          <span className="dialog-success-icon"><MailCheck size={26} /></span>
          <div className="login-form-heading">
            <h2>Check your email</h2>
            <p>If an account exists for <strong>{email}</strong>, a reset link has been sent.</p>
          </div>
          <Button asChild size="lg" className="w-full mt-6"><Link to="/login">Return to sign in</Link></Button>
          <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => setStatus('idle')}>Use a different email</Button>
        </div> : <>
          <div className="login-form-heading">
            <h2>Reset your password</h2>
            <p>Enter your account email and we’ll send you a reset link.</p>
          </div>
          <form onSubmit={submit} noValidate>
            <div className="login-field">
              <label htmlFor="reset-email">Email</label>
              <input id="reset-email" type="email" autoComplete="email" placeholder="name@company.com" value={email}
                onChange={e => setEmail(e.target.value)} disabled={status === 'loading'}
                className={error ? 'is-invalid' : ''} aria-invalid={!!error} aria-describedby={error ? 'reset-err' : undefined} />
              {error && <p id="reset-err" className="form-error">{error}</p>}
            </div>
            <Button type="submit" size="lg" className="login-submit w-full" disabled={status === 'loading'}>
              {status === 'loading' ? <><Loader2 className="animate-spin" />Sending…</> : 'Send reset link'}
            </Button>
          </form>
          <Link to="/login" className="text-link inline-flex items-center gap-1.5 mt-6 text-xs"><ArrowLeft size={13} />Back to sign in</Link>
        </>}
        <p className="login-note">This is a preview — no email is sent.</p>
      </div>
    </section>
  </div>;
}
