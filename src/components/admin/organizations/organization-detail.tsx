'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, Loader2, Pencil, Plus, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { PageHeading } from '@/components/shared/page-heading';
import { SectionHeader } from '@/components/admin/shared/detail-panels';
import { LearnersTable } from '@/components/admin/learners/learners-table';
import { UserFormDialog } from '@/components/admin/dialogs/user-form-dialog';
import { useAction } from '@/hooks/use-action';
import { setCourseAccessAction, updateOrganizationAction } from '@/lib/actions/admin';
import { statusClass } from '@/lib/format';
import type { AdminLearnerRow } from '@/lib/types';

type GrantedCourse = { id: number; code: string; title: string; statusLabel: string; grantedOn: string };
type AvailableCourse = { id: number; code: string; title: string };

export function OrganizationDetail({ organization, members, courses, availableCourses }: {
  organization: { id: number; name: string; status: 'active' | 'inactive' };
  members: AdminLearnerRow[]; courses: GrantedCourse[]; availableCourses: AvailableCourse[];
}) {
  const [dialog, setDialog] = useState<'edit' | 'member' | null>(null);
  const [name, setName] = useState(organization.name);
  const [status, setStatus] = useState(organization.status);
  const [grant, setGrant] = useState('');
  const [revoking, setRevoking] = useState<GrantedCourse | null>(null);
  const update = useAction(updateOrganizationAction);
  const access = useAction(setCourseAccessAction);
  const admins = members.filter(m => m.roleLabel === 'Corporate admin');

  const saveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await update.run({ organizationId: organization.id, name, status });
    if (res.ok) setDialog(null);
  };

  return <>
    <PageHeading
      title={<div className="flex items-center gap-3 flex-wrap"><h1>{organization.name}</h1><span className={`badge ${statusClass(organization.status === 'active' ? 'Active' : 'Inactive')}`}>{organization.status === 'active' ? 'Active' : 'Inactive'}</span></div>}
      subtitle={`${members.length} member${members.length === 1 ? '' : 's'} · ${admins.length} corporate admin${admins.length === 1 ? '' : 's'} · ${courses.length} course${courses.length === 1 ? '' : 's'}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" onClick={() => { setName(organization.name); setStatus(organization.status); update.reset(); setDialog('edit'); }}><Pencil size={15} />Edit organization</Button>
        <Button onClick={() => setDialog('member')}><UserPlus size={15} />Add member</Button>
      </div>
    </PageHeading>

    <section aria-labelledby="org-courses-heading">
      <SectionHeader id="org-courses-heading" title="Course access" meta="Corporate admins can assign these courses to their members." />
      <div className="enroll-add mb-3">
        <select className="course-select form-select" value={grant} onChange={e => setGrant(e.target.value)} aria-label="Select a course to grant" disabled={access.state === 'loading' || !availableCourses.length}>
          <option value="">{availableCourses.length ? 'Select a course to grant…' : 'All courses already granted'}</option>
          {availableCourses.map(c => <option key={c.id} value={c.id}>{c.code} · {c.title}</option>)}
        </select>
        <Button variant="outline" disabled={!grant || access.state === 'loading'}
          onClick={async () => { const r = await access.run({ organizationId: organization.id, courseId: Number(grant), granted: true }); if (r.ok) setGrant(''); }}>
          {access.state === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}Grant access</Button>
      </div>
      {access.error && <p className="form-error mb-3" role="alert">{access.error}</p>}
      <div className="table-wrap">
        <table className="training-table courses-table">
          <thead><tr><th>Course</th><th>Status</th><th>Granted</th><th className="num">Actions</th></tr></thead>
          <tbody>
            {courses.map(c => <tr key={c.id}>
              <td><div className="table-course"><span className="table-course-icon"><BookOpen size={16} /></span><div><Link href={`/admin/courses/${c.id}`} className="hover:underline"><strong>{c.title}</strong></Link><small>{c.code}</small></div></div></td>
              <td data-label="Status"><span className={`badge ${statusClass(c.statusLabel)}`}>{c.statusLabel}</span></td>
              <td data-label="Granted">{c.grantedOn}</td>
              <td data-label="Actions"><div className="courses-actions"><Button variant="ghost" size="sm" className="action-btn" onClick={() => setRevoking(c)}><Trash2 size={14} /><span>Revoke</span></Button></div></td>
            </tr>)}
            {courses.length === 0 && <tr><td colSpan={4}><div className="empty-state"><BookOpen size={28} /><p>No courses granted yet.</p></div></td></tr>}
          </tbody>
        </table>
      </div>
    </section>

    <section className="training-section" aria-labelledby="org-members-heading">
      <SectionHeader id="org-members-heading" title="Members" meta="Corporate admins manage these learners and their assignments." />
      <LearnersTable rows={members} showOrganization={false} />
    </section>

    <UserFormDialog open={dialog === 'member'} onOpenChange={o => !o && setDialog(null)} mode="create" organizations={[]}
      fixedOrganization={{ id: organization.id, name: organization.name }} canSetAccess />

    <Dialog open={dialog === 'edit'} onOpenChange={o => update.state !== 'loading' && !o && setDialog(null)}>
      <DialogContent className="modal-content">
        <form onSubmit={saveOrg} noValidate>
          <DialogHeader><DialogTitle>Edit organization</DialogTitle><DialogDescription>Deactivating blocks sign-in for all members (training history is kept).</DialogDescription></DialogHeader>
          <div className="form-stack">
            <div className="form-field"><label htmlFor="org-edit-name">Organization name</label>
              <input id="org-edit-name" className="form-input" value={name} onChange={e => setName(e.target.value)} disabled={update.state === 'loading'} /></div>
            <div className="form-field"><label htmlFor="org-edit-status">Status</label>
              <select id="org-edit-status" className="course-select form-select" value={status} onChange={e => setStatus(e.target.value as 'active' | 'inactive')} disabled={update.state === 'loading'}>
                <option value="active">Active</option><option value="inactive">Inactive</option>
              </select></div>
          </div>
          {update.error && <p className="form-error mt-3" role="alert">{update.error}</p>}
          <DialogFooter className="mt-6 gap-2">
            <Button type="button" variant="outline" onClick={() => setDialog(null)} disabled={update.state === 'loading'}>Cancel</Button>
            <Button type="submit" disabled={update.state === 'loading'}>{update.state === 'loading' ? <><Loader2 className="animate-spin" />Saving…</> : 'Save changes'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <ConfirmDialog open={!!revoking} onOpenChange={o => !o && setRevoking(null)} destructive
      title={`Revoke access to ${revoking?.title ?? ''}?`}
      description="Corporate admins will no longer be able to assign this course. Existing assignments and progress are kept."
      confirmLabel="Revoke access" onConfirm={() => { if (revoking) void access.run({ organizationId: organization.id, courseId: revoking.id, granted: false }); setRevoking(null); }} />
  </>;
}
