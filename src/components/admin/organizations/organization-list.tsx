'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, Loader2, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeading } from '@/components/shared/page-heading';
import { EmptyState } from '@/components/shared/states';
import { TableProgress } from '@/components/shared/progress-track';
import { SearchBox } from '@/components/admin/shared/filter-controls';
import { useAction } from '@/hooks/use-action';
import { createOrganizationAction } from '@/lib/actions/admin';
import { statusClass } from '@/lib/format';
import type { OrganizationRow } from '@/lib/services/organizations';

export function OrganizationList({ rows: allRows }: { rows: OrganizationRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const create = useAction(createOrganizationAction);

  const rows = useMemo(() => allRows.filter(r => r.name.toLowerCase().includes(query.trim().toLowerCase())), [allRows, query]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await create.run({ name });
    if (res.ok) { setCreating(false); router.push(`/admin/organizations/${res.data.organizationId}`); }
  };

  return <>
    <PageHeading title="Organizations" subtitle="Corporate customers, their administrators and the courses they can assign.">
      <Button onClick={() => { setName(''); create.reset(); setCreating(true); }}><Plus size={16} />Add organization</Button>
    </PageHeading>
    <div className="filter-bar"><SearchBox value={query} onChange={setQuery} placeholder="Search organizations…" label="Search organizations" /></div>

    <div className="table-wrap">
      <table className="training-table courses-table">
        <thead><tr><th>Organization</th><th className="num">Members</th><th className="num">Admins</th><th className="num">Courses</th><th>Completion rate</th><th>Status</th><th className="num">Actions</th></tr></thead>
        <tbody>
          {rows.map(r => <tr key={r.id}>
            <td><div className="table-course"><span className="table-course-icon"><Building2 size={16} /></span><div><strong>{r.name}</strong><small>Created {r.createdOn}</small></div></div></td>
            <td className="num" data-label="Members">{r.members}</td>
            <td className="num" data-label="Admins">{r.admins}</td>
            <td className="num" data-label="Courses">{r.courses}</td>
            <td data-label="Completion rate"><TableProgress value={r.completionRate} label={`${r.name} completion rate`} /></td>
            <td data-label="Status"><span className={`badge ${statusClass(r.status)}`}>{r.status}</span></td>
            <td data-label="Actions"><div className="courses-actions"><Button variant="ghost" size="sm" className="action-btn" asChild><Link href={`/admin/organizations/${r.id}`}>Manage</Link></Button></div></td>
          </tr>)}
          {rows.length === 0 && <tr><td colSpan={7}><EmptyState icon={allRows.length ? <Search size={22} /> : <Building2 size={22} />}
            title={allRows.length ? 'No organizations found' : 'No organizations yet'}
            description={allRows.length ? 'Try a different search term.' : 'Add a corporate customer to manage its learners and course access.'} /></td></tr>}
        </tbody>
      </table>
    </div>

    <Dialog open={creating} onOpenChange={o => create.state !== 'loading' && setCreating(o)}>
      <DialogContent className="modal-content">
        <form onSubmit={submit} noValidate>
          <DialogHeader><DialogTitle>Add organization</DialogTitle><DialogDescription>You can add members, corporate admins and course access next.</DialogDescription></DialogHeader>
          <div className="form-stack">
            <div className="form-field"><label htmlFor="org-name">Organization name</label>
              <input id="org-name" className={`form-input ${create.error ? 'is-invalid' : ''}`} value={name} onChange={e => setName(e.target.value)} disabled={create.state === 'loading'} autoFocus />
              {create.error && <p className="form-error">{create.error}</p>}</div>
          </div>
          <DialogFooter className="mt-6 gap-2">
            <Button type="button" variant="outline" onClick={() => setCreating(false)} disabled={create.state === 'loading'}>Cancel</Button>
            <Button type="submit" disabled={create.state === 'loading' || !name.trim()}>{create.state === 'loading' ? <><Loader2 className="animate-spin" />Creating…</> : 'Create organization'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
