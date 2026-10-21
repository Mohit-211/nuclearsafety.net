'use client';

import { Check, CheckCircle2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useCopy } from '@/hooks/use-copy';

/** Dialog success body with the sign-in details an admin passes on to the user. */
export function CredentialsView({ title, name, email, password, onClose }: {
  title: string; name: string; email: string; password: string; onClose: () => void;
}) {
  const { copied, copy } = useCopy();
  // Only rendered after a client-side action, so `window` is available.
  const details: [string, string][] = [['Sign-in page', `${window.location.origin}/login`], ['Email', email], ['Password', password]];

  return <div className="dialog-success" role="status">
    <span className="dialog-success-icon"><CheckCircle2 size={26} /></span>
    <DialogTitle>{title}</DialogTitle>
    <DialogDescription>Share these sign-in details with {name}. The password is not shown again once you close this window.</DialogDescription>
    <dl className="credentials">
      {details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className={label === 'Password' ? 'credentials-secret' : undefined}>{value}</dd></div>)}
    </dl>
    <div className="flex gap-2 mt-5 flex-wrap justify-center">
      <Button variant="outline" onClick={() => void copy(details.map(([label, value]) => `${label}: ${value}`).join('\n'))}>
        {copied ? <><Check size={14} />Copied</> : <><Copy size={14} />Copy details</>}
      </Button>
      <Button onClick={onClose}>Done</Button>
    </div>
  </div>;
}
