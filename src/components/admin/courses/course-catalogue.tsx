'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeading } from '@/components/shared/page-heading';
import { SampleNote } from '@/components/shared/sample-note';
import { EnrollmentDialog, type EnrollItem } from '@/components/admin/dialogs/enrollment-dialog';
import { PackageUploadDialog } from '@/components/admin/dialogs/package-upload-dialog';
import { FilterChips, SearchBox } from '@/components/admin/shared/filter-controls';
import { saveCourseEnrollmentAction } from '@/lib/actions/admin';
import type { AdminCourseRow } from '@/lib/types';
import { AdminCoursesTable } from './admin-courses-table';

const allFilters = ['All', 'Published', 'Draft', 'Archived'] as const;
type Filter = (typeof allFilters)[number];

export function CourseCatalogue({ rows: allRows, canManageCatalogue, learnerOptions, enrolledByCourse, defaultDueDate }: {
  rows: AdminCourseRow[]; canManageCatalogue: boolean; learnerOptions: EnrollItem[];
  enrolledByCourse: Record<number, EnrollItem[]>; defaultDueDate: string | null;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [dialog, setDialog] = useState<{ kind: 'upload' | 'manage'; row?: AdminCourseRow } | null>(null);
  const filters = canManageCatalogue ? allFilters : (['All', 'Published', 'Archived'] as const);

  const rows = useMemo(() => allRows.filter(row => {
    const matchesFilter = filter === 'All' || row.status === filter;
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || `${row.title} ${row.code} ${row.category}`.toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  }), [allRows, query, filter]);

  const closeDialog = (open: boolean) => { if (!open) setDialog(null); };
  const managed = dialog?.kind === 'manage' ? dialog.row : undefined;
  // Read during render by the React Compiler's memoisation, so it must be safe when nothing is selected.
  const managedId = managed?.id ?? 0;

  return <>
    <PageHeading title="Course catalogue" subtitle={canManageCatalogue ? 'Upload SCORM packages, manage course details and assign learners.' : 'Courses available to your organization. Assign them to your learners.'}>
      {canManageCatalogue && <Button onClick={() => setDialog({ kind: 'upload' })}><Plus size={16} />Add course</Button>}
    </PageHeading>

    <div className="filter-bar">
      <FilterChips options={filters} value={filter} onChange={setFilter} />
      <SearchBox value={query} onChange={setQuery} placeholder="Search courses…" label="Search courses" />
    </div>

    <AdminCoursesTable rows={rows} canEdit={canManageCatalogue}
      onManage={row => setDialog({ kind: 'manage', row })}
      onClearFilters={() => { setQuery(''); setFilter('All'); }} />

    {canManageCatalogue && <PackageUploadDialog open={dialog?.kind === 'upload'} onOpenChange={closeDialog} />}
    <EnrollmentDialog open={!!managed} onOpenChange={closeDialog} noun="learner" subject={managed?.title ?? ''}
      enrolled={managed ? enrolledByCourse[managed.id] ?? [] : []} available={learnerOptions} defaultDueDate={defaultDueDate}
      save={diff => saveCourseEnrollmentAction({ courseId: managedId, ...diff })} />

    {!canManageCatalogue && <SampleNote>Your platform administrator controls which courses your organization can use.</SampleNote>}
  </>;
}
