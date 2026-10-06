import { useMemo, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Search, ShieldCheck, Users } from 'lucide-react';
import { AdminShell } from '@/components/training/admin-shell';
import { adminCourses, adminLearners, learnerStatusClass } from '@/components/training/admin-data';
import { Button } from '@/components/ui/button';
import { EmptyState, TableSkeleton, useSimulatedLoad } from '@/components/training/states';

export const Route = createFileRoute('/admin/learners/')({
  head: () => ({ meta: [
    { title: 'Learners | nuclearsafety.net' },
    { name: 'description', content: 'View and manage learner accounts and training assignments.' },
    { property: 'og:title', content: 'Learners | nuclearsafety.net' },
    { property: 'og:description', content: 'View and manage learner accounts and training assignments.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: AdminLearners,
});

const filters = ['All', 'Active', 'Overdue', 'Inactive'] as const;
type Filter = (typeof filters)[number];

function AdminLearners() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [courseFilter, setCourseFilter] = useState('all');
  const loading = useSimulatedLoad();

  const rows = useMemo(() => adminLearners.filter(row => {
    const matchesFilter = filter === 'All' || row.status === filter;
    const matchesCourse = courseFilter === 'all' || row.courseIds.includes(courseFilter);
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || `${row.name} ${row.email} ${row.department}`.toLowerCase().includes(q);
    return matchesFilter && matchesCourse && matchesQuery;
  }), [query, filter, courseFilter]);

  return <AdminShell title="Learners">
    <div className="page-heading">
      <div>
        <h1>Learners</h1>
        <p className="subtitle">Manage learner accounts and their assigned training.</p>
      </div>
    </div>

    <div className="filter-bar">
      {filters.map(f => (
        <Button
          key={f}
          variant="outline"
          size="sm"
          className={`filter-chip ${filter === f ? 'filter-active' : ''}`}
          onClick={() => setFilter(f)}
        >{f}</Button>
      ))}
      <label className="search-box flex items-center gap-2">
        <Search size={14} className="text-muted-foreground shrink-0" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search learners…"
          aria-label="Search learners"
          className="w-full bg-transparent text-[12px] outline-none placeholder:text-muted-foreground"
        />
      </label>
      <select
        value={courseFilter}
        onChange={e => setCourseFilter(e.target.value)}
        aria-label="Filter by course"
        className="course-select"
      >
        <option value="all">All courses</option>
        {adminCourses.map(c => <option key={c.id} value={c.id}>{c.id} · {c.title}</option>)}
      </select>
    </div>

    {loading ? <TableSkeleton rows={8} cols={6} /> : <div className="table-wrap">
      <table className="training-table courses-table">
        <thead>
          <tr>
            <th>Learner</th>
            <th className="col-email">Email</th>
            <th className="num">Assigned courses</th>
            <th>Progress</th>
            <th>Status</th>
            <th className="col-activity">Last activity</th>
            <th className="num">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => <tr key={row.id}>
            <td>
              <div className="table-course">
                <span className="table-course-icon learner-icon"><Users size={15} /></span>
                <div><strong>{row.name}</strong><small>{row.department}</small></div>
              </div>
            </td>
            <td className="col-email" data-label="Email">{row.email}</td>
            <td className="num font-medium" data-label="Assigned courses">{row.courseIds.length}</td>
            <td data-label="Progress">
              <div className="table-progress">
                <div className="progress-track" role="progressbar" aria-label={`${row.name} average progress`} aria-valuenow={row.progress} aria-valuemin={0} aria-valuemax={100}>
                  <div className={`progress-fill ${row.progress === 100 ? 'p100' : ''}`} style={row.progress > 0 ? { width: `${row.progress}%` } : undefined} />
                </div>
                <span>{row.progress}%</span>
              </div>
            </td>
            <td data-label="Status"><span className={`badge ${learnerStatusClass(row.status)}`}>{row.status}</span></td>
            <td className="col-activity" data-label="Last activity">{row.lastActivity}</td>
            <td data-label="Actions">
              <div className="courses-actions">
                <Button variant="ghost" size="sm" className="action-btn" asChild>
                  <Link to="/admin/learners/$learnerId" params={{ learnerId: row.id }} aria-label={`View ${row.name}`}>
                    <span>View learner</span>
                  </Link>
                </Button>
              </div>
            </td>
          </tr>)}
          {rows.length === 0 && (
            <tr><td colSpan={7}><EmptyState icon={<Users size={22} />} title="No learners found" description="Try a different search term or filter." action={<Button variant="outline" size="sm" onClick={() => { setQuery(''); setFilter('All'); setCourseFilter('all'); }}>Clear filters</Button>} /></td></tr>
          )}
        </tbody>
      </table>
    </div>}

    <div className="flex items-center gap-3 mt-5 text-[11px] text-muted-foreground">
      <ShieldCheck size={16} className="text-primary" />
      <span>Sample data only — Showing {rows.length} of {adminLearners.length} sample learners; learner profiles are demonstrations in this preview.</span>
    </div>
  </AdminShell>;
}
