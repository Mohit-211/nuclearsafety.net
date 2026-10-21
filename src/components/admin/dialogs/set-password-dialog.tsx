'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CredentialsView } from '@/components/admin/shared/credentials-view';
import { PasswordField } from '@/components/admin/shared/password-field';
import { useAction } from '@/hooks/use-action';
import { setUserPasswordAction } from '@/lib/actions/admin';

/** Set (invited users) or reset a user's password, then show it so the admin can share it. */
export function SetPasswordDialog({ open, onOpenChange, user, hasPassword }: {
  open: boolean; onOpenChange: (o: boolean) => void; user: { id: number; name: string; email: string }; hasPassword: boolean;
}) {
  const [password, setPassword] = useState('');
  // Captured on open: the page refreshes after saving, which flips `hasPassword`.
  const [reset, setReset] = useState(hasPassword);
  const action = useAction(setUserPasswordAction);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) { setPassword(''); setReset(hasPassword); action.reset(); }
  }

  const busy = action.state === 'loading';
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    void action.run({ userId: user.id, password });
  };

  return <Dialog open={open} onOpenChange={o => !busy && onOpenChange(o)}>
    <DialogContent className="modal-content">
      {action.state === 'success'
        ? <CredentialsView title={reset ? 'Password reset' : 'Password set'} name={user.name} email={user.email} password={password} onClose={() => onOpenChange(false)} />
        : <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>{reset ? 'Reset password' : 'Set password'}</DialogTitle>
            <DialogDescription>
              Choose a password for {user.name} and share it with them yourself. {reset
                ? 'Their current password stops working and they are signed out on all devices.'
                : 'Their emailed invite link stops working.'}
            </DialogDescription>
          </DialogHeader>
          <div className="form-stack">
            <PasswordField id="sp-password" value={password} onChange={setPassword} disabled={busy} error={action.fieldErrors.password} />
          </div>
          {action.error && !action.fieldErrors.password && <p className="form-error mt-3" role="alert">{action.error}</p>}
          <DialogFooter className="mt-6 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy || !password}>{busy ? <><Loader2 className="animate-spin" />Saving…</> : reset ? 'Reset password' : 'Set password'}</Button>
          </DialogFooter>
        </form>}
    </DialogContent>
  </Dialog>;
}
