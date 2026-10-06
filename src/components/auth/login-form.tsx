'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAction } from '@/hooks/use-action';
import { login } from '@/lib/actions/auth';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const action = useAction(login, { refresh: false });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (action.state !== 'idle' && action.state !== 'error') return;
    const result = await action.run({ email, password, remember });
    if (result.ok) {
      router.replace(result.data.redirectTo);
      router.refresh();
    }
  };

  const busy = action.state === 'loading' || action.state === 'success';

  return (
    <form onSubmit={handleSubmit}>
      {action.error && <p className="form-error mb-4" role="alert">{action.error}</p>}
      <div className="login-field">
        <label htmlFor="login-email">Email</label>
        <input id="login-email" type="email" autoComplete="email" placeholder="name@company.com" required disabled={busy}
          value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div className="login-field">
        <label htmlFor="login-password">Password</label>
        <input id="login-password" type="password" autoComplete="current-password" placeholder="Enter your password" required disabled={busy}
          value={password} onChange={e => setPassword(e.target.value)} />
      </div>

      <div className="login-row">
        <label className="login-remember">
          <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} disabled={busy} />
          Remember me
        </label>
        <Link href="/forgot-password" className="text-link">Forgot password?</Link>
      </div>

      <Button type="submit" size="lg" className="login-submit w-full" disabled={busy}>
        {action.state === 'loading' ? <><Loader2 className="animate-spin" />Signing in…</>
          : action.state === 'success' ? <><CheckCircle2 className="text-success" />Signed in</>
            : 'Sign in'}
      </Button>
    </form>
  );
}
