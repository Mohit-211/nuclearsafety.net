import { useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { CheckCircle2, Circle, Download, Loader, Loader2, ShieldCheck, Users } from 'lucide-react';
import { AdminShell } from '@/components/training/admin-shell';
import { adminCourses, reportRows, reportStatusClass } from '@/components/training/admin-data';
import { Button } from '@/components/ui/button';
import { EmptyState, TableSkeleton, useFakeAction, useSimulatedLoad } from '@/components/training/states';

export const Route = createFileRoute('/admin/reports')({
  head: () => ({ meta: [
    { title: 'Reports | nuclearsafety.net' },
    { name: 'description', content: 'Training completion and compliance reports.' },
    { property: 'og:title', content: 'Reports | nuclearsafety.net' },
    { property: 'og:description', content: 'Training completion and compliance reports.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: AdminReports,
});

const statusFilters = ['All', 'Completed', 'In progress', 'Not started'] as const;
type StatusFilter = (typeof statusFilters)[number];

const dateRanges = [
  { value: 'all', label: 'All time' },
  { value: '90', label: 'Last 90 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '7', label: 'Last 7 days' },
] as const;

const learners = [...new Set(reportRows.map(r => r.learner))];

function AdminReports() {
  const [dateRange, setDateRange] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [learnerFilter, setLearnerFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const exportAction = useFakeAction(1000);
  const loading = useSimulatedLoad();

  const rows = useMemo(() => reportRows.filter(row => {
    const matchesRange = dateRange === 'all' || row.daysAgo <= Number(dateRange);
    const matchesCourse = courseFilter === 'all' || row.courseId === courseFilter;
    const matchesLearner = learnerFilter === 'all' || row.learner === learnerFilter;
    const matchesStatus = statusFilter === 'All' || row.status === statusFilter;
    return matchesRange && matchesCourse && matchesLearner && matchesStatus;
  }), [dateRange, courseFilter, learnerFilter, statusFilter]);

  const stats = useMemo(() => {
    const unique = new Set(rows.map(r => r.learner));
    return {
      learners: unique.size,
      completed: rows.filter(r => r.status === 'Completed').length,
      inProgress: rows.filter(r => r.status === 'In progress').length,
      notStarted: rows.filter(r => r.status === 'Not started').length,
    };
  }, [rows]);

  return <AdminShell title="Reports">
    <div className="page-heading">
      <div>
        <h1>Reports</h1>
        <p className="subtitle">Completion and compliance reporting for your organisation.</p>
      </div>
      <Button size="sm" disabled={exportAction.state === 'loading'} onClick={() => exportAction.run()}>
        {exportAction.state === 'loading' ? <><Loader2 size={15} className="animate-spin" /> Preparing…</> : exportAction.state === 'success' ? <><CheckCircle2 size={15} /> Report ready</> : <><Download size={15} /> Export report</>}
      </Button>
    </div>

    {exportAction.state === 'success' && (
      <div className="dialog-note" style={{ marginBottom: 18 }} role="status">
        Preview only — no file is generated.
      </div>
    )}

    <div className="filter-bar">
      <select
        value={dateRange}
        onChange={e => setDateRange(e.target.value)}
        aria-label="Filter by date range"
        className="course-select"
      >
        {dateRanges.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
      <select
        value={courseFilter}
        onChange={e => setCourseFilter(e.target.value)}
        aria-label="Filter by course"
        className="course-select"
      >
        <option value="all">All courses</option>
        {adminCourses.map(c => <option key={c.id} value={c.id}>{c.id} · {c.title}</option>)}
      </select>
      <select
        value={learnerFilter}
        onChange={e => setLearnerFilter(e.target.value)}
        aria-label="Filter by learner"
        className="course-select"
      >
        <option value="all">All learners</option>
        {learners.map(l => <option key={l} value={l}>{l}</option>)}
      </select>
      {statusFilters.map(f => (
        <Button
          key={f}
          variant="outline"
          size="sm"
          className={`filter-chip ${statusFilter === f ? 'filter-active' : ''}`}
          onClick={() => setStatusFilter(f)}
        >{f}</Button>
      ))}
    </div>

    <div className="stats-grid">
      <div className="stat">
        <div className="stat-top"><span>Total learners</span><span className="stat-icon"><Users size={15} /></span></div>
        <div className="stat-value">{stats.learners}</div>
        <div className="stat-note">In the current report selection</div>
      </div>
      <div className="stat">
        <div className="stat-top"><span>Completed</span><span className="stat-icon success"><CheckCircle2 size={15} /></span></div>
        <div className="stat-value">{stats.completed}</div>
        <div className="stat-note">Course completions</div>
      </div>
      <div className="stat">
        <div className="stat-top"><span>In progress</span><span className="stat-icon warning"><Loader size={15} /></span></div>
        <div className="stat-value">{stats.inProgress}</div>
        <div className="stat-note">Actively training</div>
      </div>
      <div className="stat">
        <div className="stat-top"><span>Not started</span><span className="stat-icon"><Circle size={15} /></span></div>
        <div className="stat-value">{stats.notStarted}</div>
        <div className="stat-note">Assigned, not yet begun</div>
      </div>
    </div>

    {loading ? <TableSkeleton rows={8} cols={6} /> : <div className="table-wrap">
      <table className="training-table courses-table">
        <thead>
          <tr>
            <th>Learner</th>
            <th className="col-course-name">Course</th>
            <th>Progress</th>
            <th className="col-score num">Score</th>
            <th>Status</th>
            <th className="col-activity">Completion date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.learner}-${row.courseId}-${i}`}>
              <td>
                <div className="table-course">
                  <span className="table-course-icon learner-icon"><Users size={15} /></span>
                  <div><strong>{row.learner}</strong><small>{row.department}</small></div>
                </div>
              </td>
              <td className="col-course-name" data-label="Course">{row.course}</td>
              <td data-label="Progress">
                <div className="table-progress">
                  <div className="progress-track" role="progressbar" aria-label={`${row.learner} progress in ${row.course}`} aria-valuenow={row.progress} aria-valuemin={0} aria-valuemax={100}>
                    <div className={`progress-fill ${row.progress === 100 ? 'p100' : ''}`} style={row.progress > 0 ? { width: `${row.progress}%` } : undefined} />
                  </div>
                  <span>{row.progress}%</span>
                </div>
              </td>
              <td className="col-score num font-medium" data-label="Score">{row.score ?? '—'}</td>
              <td data-label="Status"><span className={`badge ${reportStatusClass(row.status)}`}>{row.status}</span></td>
              <td className="col-activity" data-label="Completion date">{row.status === 'Completed' ? row.date : '—'}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={6}><EmptyState icon={<ShieldCheck size={22} />} title="No report results" description="No training records match the selected filters." action={<Button variant="outline" size="sm" onClick={() => { setDateRange('all'); setCourseFilter('all'); setLearnerFilter('all'); setStatusFilter('All'); }}>Reset filters</Button>} /></td></tr>
          )}
        </tbody>
      </table>
    </div>}

    <div className="flex items-center gap-3 mt-5 text-[11px] text-muted-foreground">
      <ShieldCheck size={16} className="text-primary" />
      <span>Sample data only — Showing {rows.length} of {reportRows.length} sample training records; reports are demonstrations in this preview.</span>
    </div>
  </AdminShell>;
}
