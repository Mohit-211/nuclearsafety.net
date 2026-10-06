'use client';

import { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { AccountCard } from '@/components/shared/account-card';
import { useAction } from '@/hooks/use-action';
import { saveSettingsAction } from '@/lib/actions/admin';
import { SaveButton } from './save-button';

export function TrainingSection({ initial }: { initial: { defaultDueDays: number } }) {
  const [dueWindow, setDueWindow] = useState(String(initial.defaultDueDays));
  const action = useAction(saveSettingsAction);

  return (
    <AccountCard icon={GraduationCap} title="Training settings" subtitle="Defaults used when assigning courses."
      action={<SaveButton state={action.state} onSave={() => action.run({ defaultDueDays: Number(dueWindow) })} />}>
      {action.error && <p className="form-error mb-3" role="alert">{action.error}</p>}
      <div className="account-grid">
        <div className="account-field">
          <Label htmlFor="st-due">Default due date after assignment</Label>
          <select id="st-due" className="course-select w-full" value={dueWindow} onChange={e => setDueWindow(e.target.value)}>
            <option value="0">No default due date</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
          </select>
          <p className="text-[11px] text-muted-foreground mt-1">Pre-filled in the enrollment dialog; admins can change it per assignment.</p>
        </div>
      </div>
    </AccountCard>
  );
}
