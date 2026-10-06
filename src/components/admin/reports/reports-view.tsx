'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, Loader, Users } from 'lucide-react';
import { PageHeading } from '@/components/shared/page-heading';
import { SampleNote } from '@/components/shared/sample-note';
import { StatsGrid } from '@/components/shared/stat-card';
import { FilterChips, FilterSelect } from '@/components/admin/shared/filter-controls';
import type { Option, ReportRow } from '@/lib/types';
import { ExportButton } from './export-button';
import { ReportTable } from './report-table';

const statusFilters = ['All', 'Completed', 'In progress', 'Not started'] as const;
type StatusFilter = (typeof statusFilters)[number];

const dateRanges = [
  { value: 'all', label: 'All time' },
  { value: '90', label: 'Last 90 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '7', label: 'Last 7 days' },
] as const;

export function ReportsView({ rows: allRows, courses, isPlatform, scopeName }: { rows: ReportRow[]; courses: Option[]; isPlatform: boolean; scopeName: string }) {
  const [dateRange, setDateRange] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [learnerFilter, setLearnerFilter] = useState('all');
  const [orgFilter, setOrgFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');

  const learners = useMemo(() => [...new Map(allRows.map(r => [r.email, r.learner])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [allRows]);
  const organizations = useMemo(() => [...new Set(allRows.map(r => r.organization).filter((o): o is string => !!o))].sort(), [allRows]);

  const rows = useMemo(() => allRows.filter(row => {
    const matchesRange = dateRange === 'all' || row.daysAgo <= Number(dateRange);
    const matchesCourse = courseFilter === 'all' || row.courseId === Number(courseFilter);
    const matchesLearner = learnerFilter === 'all' || row.email === learnerFilter;
    const matchesOrg = orgFilter === 'all' || (orgFilter === '__individual' ? !row.organization : row.organization === orgFilter);
    const matchesStatus = statusFilter === 'All' || row.status === statusFilter;
    return matchesRange && matchesCourse && matchesLearner && matchesOrg && matchesStatus;
  }), [allRows, dateRange, courseFilter, learnerFilter, orgFilter, statusFilter]);

  const count = (status: StatusFilter) => rows.filter(r => r.status === status).length;
  const resetFilters = () => { setDateRange('all'); setCourseFilter('all'); setLearnerFilter('all'); setOrgFilter('all'); setStatusFilter('All'); };

  return <>
    <PageHeading title="Reports" subtitle={`Completion and compliance reporting for ${scopeName}.`}>
      <ExportButton />
    </PageHeading>

    <div className="filter-bar">
      <FilterSelect value={dateRange} onChange={setDateRange} label="Filter by date range">
        {dateRanges.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
      </FilterSelect>
      <FilterSelect value={courseFilter} onChange={setCourseFilter} label="Filter by course">
        <option value="all">All courses</option>
        {courses.map(c => <option key={c.id} value={c.id}>{c.meta} · {c.label}</option>)}
      </FilterSelect>
      {isPlatform && <FilterSelect value={orgFilter} onChange={setOrgFilter} label="Filter by organization">
        <option value="all">All organizations</option>
        <option value="__individual">Individual learners</option>
        {organizations.map(o => <option key={o} value={o}>{o}</option>)}
      </FilterSelect>}
      <FilterSelect value={learnerFilter} onChange={setLearnerFilter} label="Filter by learner">
        <option value="all">All learners</option>
        {learners.map(([email, name]) => <option key={email} value={email}>{name}</option>)}
      </FilterSelect>
      <FilterChips options={statusFilters} value={statusFilter} onChange={setStatusFilter} />
    </div>

    <StatsGrid stats={[
      { label: 'Total learners', value: new Set(rows.map(r => r.email)).size, note: 'In the current report selection', icon: Users, iconSize: 15 },
      { label: 'Completed', value: count('Completed'), note: 'Course completions', icon: CheckCircle2, tone: 'success', iconSize: 15 },
      { label: 'In progress', value: count('In progress'), note: 'Actively training', icon: Loader, tone: 'warning', iconSize: 15 },
      { label: 'Not started', value: count('Not started'), note: 'Assigned, not yet begun', icon: Circle, iconSize: 15 },
    ]} />

    <ReportTable rows={rows} showOrganization={isPlatform} onResetFilters={resetFilters} />

    <SampleNote>Showing {rows.length} of {allRows.length} current assignments. Score and result are reported by the SCORM course; the export contains all assignments in your scope.</SampleNote>
  </>;
}
