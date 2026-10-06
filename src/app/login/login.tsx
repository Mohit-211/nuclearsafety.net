import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/login')({
  head: () => ({
    meta: [
      { title: 'Sign in | nuclearsafety.net' },
      { name: 'description', content: 'Sign in to your nuclear safety training account.' },
      { property: 'og:title', content: 'Sign in | nuclearsafety.net' },
      { property: 'og:description', content: 'Sign in to access your assigned nuclear safety training.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: LoginPage,
});

type Status = 'idle' | 'loading' | 'success';

function LoginPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('idle');
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    if (status !== 'success') return;
    const timer = setTimeout(() => navigate({ to: '/' }), 1400);
    return () => clearTimeout(timer);
  }, [status, navigate]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status !== 'idle') return;
    setStatus('loading');
    setTimeout(() => setStatus('success'), 1200);
  };

  const busy = status !== 'idle';

  return (
    <div className="login-page">
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
          <div className="login-form-heading">
            <h2>Sign in to your account</h2>
            <p>Use the email address assigned by your training coordinator.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                required
                disabled={busy}
              />
            </div>
            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                disabled={busy}
              />
            </div>

            <div className="login-row">
              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  disabled={busy}
                />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-link">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" size="lg" className="login-submit w-full" disabled={busy}>
              {status === 'idle' && 'Sign in'}
              {status === 'loading' && <><Loader2 className="animate-spin" />Signing in…</>}
              {status === 'success' && <><CheckCircle2 className="text-success" />Signed in</>}
            </Button>
          </form>

          <p className="login-note">
            This is a preview — no account or sign-in service is connected yet.
          </p>
        </div>
      </section>
    </div>
  );
}
