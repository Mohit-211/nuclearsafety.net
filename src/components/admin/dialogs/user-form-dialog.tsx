'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SuccessView } from '@/components/shared/success-view';
import { useAction } from '@/hooks/use-action';
import { createUserAction, setUserAccessAction, updateUserAction } from '@/lib/actions/admin';
import type { Option } from '@/lib/types';

export type AccountType = 'individual' | 'member' | 'org_admin' | 'platform_admin';

export function accountTypeToAccess(type: AccountType, organizationId: number | null) {
  return {
    platformRole: type === 'platform_admin' ? 'platform_admin' as const : 'learner' as const,
    organizationId: type === 'member' || type === 'org_admin' ? organizationId : null,
    orgRole: type === 'org_admin' ? 'admin' as const : 'member' as const,
  };
}

/** Account type + organization pickers (platform admins only). */
function AccessFields({ type, setType, orgId, setOrgId, organizations, busy, error }: {
  type: AccountType; setType: (t: AccountType) => void; orgId: string; setOrgId: (v: string) => void; organizations: Option[]; busy: boolean; error?: string;
}) {
  const needsOrg = type === 'member' || type === 'org_admin';
  return <div className="form-row">
    <div className="form-field"><label htmlFor="uf-type">Account type</label>
      <select id="uf-type" className="course-select form-select" value={type} onChange={e => setType(e.target.value as AccountType)} disabled={busy}>
        <option value="individual">Individual learner</option>
        <option value="member">Corporate learner</option>
        <option value="org_admin">Corporate admin</option>
        <option value="platform_admin">Platform admin</option>
      </select></div>
    <div className="form-field"><label htmlFor="uf-org">Organization</label>
      <select id="uf-org" className={`course-select form-select ${error ? 'is-invalid' : ''}`} value={needsOrg ? orgId : ''} onChange={e => setOrgId(e.target.value)} disabled={busy || !needsOrg}>
        <option value="">{needsOrg ? 'Select an organization…' : 'Not applicable'}</option>
        {organizations.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      {error && <p className="form-error">{error}</p>}</div>
  </div>;
}

type Details = { name: string; email: string; jobTitle: string; department: string };
const blank: Details = { name: '', email: '', jobTitle: '', department: '' };

/** Create a user (sends an invite email) or edit an existing user's details. */
export function UserFormDialog({ open, onOpenChange, mode, userId, initial, organizations, fixedOrganization, canSetAccess }: {
  open: boolean; onOpenChange: (o: boolean) => void; mode: 'create' | 'edit'; userId?: number; initial?: Details;
  /** Platform admins: organizations to choose from. */
  organizations: Option[];
  /** Create the user inside this organization (organization page / corporate admins). */
  fixedOrganization?: { id: number; name: string };
  canSetAccess: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Details>(initial ?? blank);
  const [type, setType] = useState<AccountType>(fixedOrganization ? 'member' : 'individual');
  const [orgId, setOrgId] = useState(fixedOrganization ? String(fixedOrganization.id) : '');
  const [orgError, setOrgError] = useState('');
  const action = useAction(async (v: Details) => {
    if (mode === 'edit') return updateUserAction({ userId: userId!, ...v });
    const access = canSetAccess ? accountTypeToAccess(type, orgId ? Number(orgId) : null) : { platformRole: 'learner' as const, organizationId: fixedOrganization?.id ?? null, orgRole: 'member' as const };
    return createUserAction({ ...v, ...access });
  });

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) { setValues(initial ?? blank); setType(fixedOrganization ? 'member' : 'individual'); setOrgId(fixedOrganization ? String(fixedOrganization.id) : ''); setOrgError(''); action.reset(); }
  }

  const set = (k: keyof Details, v: string) => setValues(s => ({ ...s, [k]: v }));
  const busy = action.state === 'loading';
  const fe = action.fieldErrors;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create' && canSetAccess && (type === 'member' || type === 'org_admin') && !orgId) { setOrgError('Select an organization.'); return; }
    setOrgError('');
    void action.run(values);
  };

  const result = action.state === 'success';
  return <Dialog open={open} onOpenChange={o => !busy && onOpenChange(o)}>
    <DialogContent className="modal-content">
      {result
        ? <SuccessView title={mode === 'create' ? 'Account created' : 'Changes saved'}
          text={mode === 'create' ? `An email with a link to set a password has been sent to ${values.email}.` : 'The learner details have been updated.'}
          onClose={() => { onOpenChange(false); router.refresh(); }} />
        : <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Add user' : 'Edit learner'}</DialogTitle>
            <DialogDescription>{mode === 'create'
              ? fixedOrganization ? `New account in ${fixedOrganization.name}. They will receive an email to set their password.` : 'They will receive an email to set their password.'
              : 'Update name and contact details.'}</DialogDescription>
          </DialogHeader>
          <div className="form-stack">
            <div className="form-row">
              <div className="form-field"><label htmlFor="uf-name">Full name</label>
                <input id="uf-name" className={`form-input ${fe.name ? 'is-invalid' : ''}`} value={values.name} onChange={e => set('name', e.target.value)} disabled={busy} />
                {fe.name && <p className="form-error">{fe.name}</p>}</div>
              <div className="form-field"><label htmlFor="uf-email">Email</label>
                <input id="uf-email" type="email" className={`form-input ${fe.email ? 'is-invalid' : ''}`} value={values.email} onChange={e => set('email', e.target.value)} disabled={busy} />
                {fe.email && <p className="form-error">{fe.email}</p>}</div>
            </div>
            <div className="form-row">
              <div className="form-field"><label htmlFor="uf-job">Job title</label>
                <input id="uf-job" className="form-input" value={values.jobTitle} onChange={e => set('jobTitle', e.target.value)} disabled={busy} /></div>
              <div className="form-field"><label htmlFor="uf-dept">Department</label>
                <input id="uf-dept" className="form-input" value={values.department} onChange={e => set('department', e.target.value)} disabled={busy} /></div>
            </div>
            {mode === 'create' && canSetAccess && !fixedOrganization &&
              <AccessFields type={type} setType={setType} orgId={orgId} setOrgId={setOrgId} organizations={organizations} busy={busy} error={orgError} />}
            {mode === 'create' && canSetAccess && fixedOrganization && <div className="form-field"><label htmlFor="uf-role">Role in {fixedOrganization.name}</label>
              <select id="uf-role" className="course-select form-select" value={type} onChange={e => setType(e.target.value as AccountType)} disabled={busy}>
                <option value="member">Learner</option><option value="org_admin">Corporate admin</option>
              </select></div>}
          </div>
          {action.error && !Object.keys(fe).length && <p className="form-error mt-3" role="alert">{action.error}</p>}
          <DialogFooter className="mt-6 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? <><Loader2 className="animate-spin" />Saving…</> : mode === 'create' ? 'Create & send invite' : 'Save changes'}</Button>
          </DialogFooter>
        </form>}
    </DialogContent>
  </Dialog>;
}

/** Platform admins: change a user's account type / organization. */
export function AccessDialog({ open, onOpenChange, userId, current, organizations }: {
  open: boolean; onOpenChange: (o: boolean) => void; userId: number; current: { type: AccountType; organizationId: number | null }; organizations: Option[];
}) {
  const [type, setType] = useState<AccountType>(current.type);
  const [orgId, setOrgId] = useState(current.organizationId ? String(current.organizationId) : '');
  const [orgError, setOrgError] = useState('');
  const action = useAction(setUserAccessAction);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) { setType(current.type); setOrgId(current.organizationId ? String(current.organizationId) : ''); setOrgError(''); action.reset(); }
  }
  const busy = action.state === 'loading';
  const submit = () => {
    if ((type === 'member' || type === 'org_admin') && !orgId) { setOrgError('Select an organization.'); return; }
    void action.run({ userId, ...accountTypeToAccess(type, orgId ? Number(orgId) : null) });
  };

  return <Dialog open={open} onOpenChange={o => !busy && onOpenChange(o)}>
    <DialogContent className="modal-content">
      {action.state === 'success'
        ? <SuccessView title="Access updated" text="The account type and organization have been saved." onClose={() => onOpenChange(false)} />
        : <>
          <DialogHeader><DialogTitle>Account type & organization</DialogTitle>
            <DialogDescription>Existing course assignments and training history are kept.</DialogDescription></DialogHeader>
          <div className="form-stack"><AccessFields type={type} setType={setType} orgId={orgId} setOrgId={setOrgId} organizations={organizations} busy={busy} error={orgError} /></div>
          {action.error && <p className="form-error mt-3" role="alert">{action.error}</p>}
          <DialogFooter className="mt-6 gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button onClick={submit} disabled={busy}>{busy ? <><Loader2 className="animate-spin" />Saving…</> : 'Save access'}</Button>
          </DialogFooter>
        </>}
    </DialogContent>
  </Dialog>;
}
