'use client';

import { useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PasswordToggle } from '@/components/shared/password-toggle';
import { useCopy } from '@/hooks/use-copy';
import { generatePassword } from '@/lib/auth/password-generator';

/** A password an admin chooses for a user: type or generate one, show it and copy it. */
export function PasswordField({ id, value, onChange, disabled, error, hint }: {
  id: string; value: string; onChange: (value: string) => void; disabled?: boolean; error?: string; hint?: string;
}) {
  const [shown, setShown] = useState(false);
  const { copied, copy } = useCopy();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return <div className="form-field">
    <label htmlFor={id}>Password</label>
    <div className="password-field">
      <div className="relative flex-1 min-w-0">
        <input id={id} type={shown ? 'text' : 'password'} autoComplete="new-password" spellCheck={false} placeholder="At least 10 characters"
          className={`form-input pr-10 ${error ? 'is-invalid' : ''}`} value={value} onChange={e => onChange(e.target.value)}
          disabled={disabled} aria-invalid={!!error} aria-describedby={describedBy} />
        <PasswordToggle shown={shown} onToggle={() => setShown(s => !s)} />
      </div>
      <Button type="button" variant="outline" onClick={() => { onChange(generatePassword()); setShown(true); }} disabled={disabled}>
        <RefreshCw size={14} />Generate
      </Button>
      <Button type="button" variant="outline" size="icon" aria-label={copied ? 'Password copied' : 'Copy password'} title="Copy password"
        onClick={() => void copy(value)} disabled={disabled || !value}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </Button>
    </div>
    {error ? <p id={`${id}-error`} className="form-error">{error}</p> : hint && <p id={`${id}-hint`} className="form-hint">{hint}</p>}
  </div>;
}
