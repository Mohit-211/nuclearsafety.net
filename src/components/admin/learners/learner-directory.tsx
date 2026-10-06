'use client';

import { useMemo, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeading } from '@/components/shared/page-heading';
import { FilterChips, FilterSelect, SearchBox } from '@/components/admin/shared/filter-controls';
import { UserFormDialog } from '@/components/admin/dialogs/user-form-dialog';
import type { AdminLearnerRow, Option } from '@/lib/types';
import { LearnersTable } from './learners-table';

const filters = ['All', 'Active', 'Overdue', 'Invited', 'Inactive'] as const;
type Filter = (typeof filters)[number];

export function LearnerDirectory({ rows: allRows, courses, organizations, isPlatform, organizationName }: {
  rows: AdminLearnerRow[]; courses: Option[]; organizations: Option[]; isPlatform: boolean; organizationName: string | null;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [courseFilter, setCourseFilter] = useState('all');
  const [orgFilter, setOrgFilter] = useState('all');
  const [creating, setCreating] = useState(false);

  const rows = useMemo(() => allRows.filter(row => {
    const matchesFilter = filter === 'All' || row.status === filter;
    const matchesCourse = courseFilter === 'all' || row.courseIds.includes(Number(courseFilter));
    const matchesOrg = orgFilter === 'all' || (orgFilter === 'none' ? row.organizationId === null : row.organizationId === Number(orgFilter));
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || `${row.name} ${row.email} ${row.department} ${row.organization ?? ''}`.toLowerCase().includes(q);
    return matchesFilter && matchesCourse && matchesOrg && matchesQuery;
  }), [allRows, query, filter, courseFilter, orgFilter]);

  return <>
    <PageHeading title="Learners" subtitle={isPlatform ? 'Manage individual and corporate accounts and their assigned training.' : `Manage ${organizationName}’s learners and their assigned training.`}>
      <Button onClick={() => setCreating(true)}><UserPlus size={16} />Add {isPlatform ? 'user' : 'learner'}</Button>
    </PageHeading>

    <div className="filter-bar">
      <FilterChips options={filters} value={filter} onChange={setFilter} />
      <SearchBox value={query} onChange={setQuery} placeholder="Search learners…" label="Search learners" />
      <FilterSelect value={courseFilter} onChange={setCourseFilter} label="Filter by course">
        <option value="all">All courses</option>
        {courses.map(c => <option key={c.id} value={c.id}>{c.meta} · {c.label}</option>)}
      </FilterSelect>
      {isPlatform && <FilterSelect value={orgFilter} onChange={setOrgFilter} label="Filter by organization">
        <option value="all">All accounts</option>
        <option value="none">Individual accounts</option>
        {organizations.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </FilterSelect>}
    </div>

    <LearnersTable rows={rows} showOrganization={isPlatform} onClearFilters={() => { setQuery(''); setFilter('All'); setCourseFilter('all'); setOrgFilter('all'); }} />
    <p className="text-[11px] text-muted-foreground mt-4">Showing {rows.length} of {allRows.length} accounts.</p>

    <UserFormDialog open={creating} onOpenChange={setCreating} mode="create" organizations={organizations} canSetAccess={isPlatform} />
  </>;
}
