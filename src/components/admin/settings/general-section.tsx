'use client';

import { useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AccountCard } from '@/components/shared/account-card';
import { useAction } from '@/hooks/use-action';
import { saveSettingsAction } from '@/lib/actions/admin';
import { SaveButton } from './save-button';

/** Support contact shown to learners and admins in the Help & support dialogs. */
export function GeneralSection({ initial }: { initial: { supportEmail: string; supportMessage: string } }) {
  const [values, setValues] = useState(initial);
  const action = useAction(saveSettingsAction);

  return (
    <AccountCard icon={LifeBuoy} title="Help & support" subtitle="Shown to everyone in the Help & support dialog."
      action={<SaveButton state={action.state} onSave={() => action.run(values)} />}>
      {action.error && <p className="form-error mb-3" role="alert">{action.fieldErrors.supportEmail ?? action.error}</p>}
      <div className="account-grid">
        <div className="account-field">
          <Label htmlFor="st-email">Training support email</Label>
          <Input id="st-email" type="email" placeholder="training@example.com" value={values.supportEmail} onChange={e => setValues({ ...values, supportEmail: e.target.value })} />
        </div>
        <div className="account-field account-field-wide">
          <Label htmlFor="st-msg">Support message</Label>
          <Input id="st-msg" value={values.supportMessage} onChange={e => setValues({ ...values, supportMessage: e.target.value })} />
        </div>
      </div>
    </AccountCard>
  );
}
