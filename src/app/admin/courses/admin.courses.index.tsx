import { useMemo, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { BookOpen, Eye, Pencil, Plus, Search, Settings2, ShieldCheck } from 'lucide-react';
import { AdminShell } from '@/components/training/admin-shell';
import { adminCourses, type AdminCourseRow } from '@/components/training/admin-data';
import { Button } from '@/components/ui/button';
import { CourseFormDialog, EnrollmentDialog } from '@/components/training/admin-dialogs';
import { EmptyState, TableSkeleton, useSimulatedLoad } from '@/components/training/states';
import { adminLearners, courseEnrollments } from '@/components/training/admin-data';

export const Route = createFileRoute('/admin/courses/')({
  head: () => ({ meta: [
    { title: 'Courses | nuclearsafety.net' },
    { name: 'description', content: 'Manage the course catalogue and learner assignments.' },
    { property: 'og:title', content: 'Courses | nuclearsafety.net' },
    { property: 'og:description', content: 'Manage the course catalogue and learner assignments.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: AdminCourses,
});

const filters = ['All', 'Published', 'Draft'] as const;
type Filter = (typeof filters)[number];

function statusBadgeClass(status: AdminCourseRow['status']) {
  return status === 'Published' ? 'completed' : '';
}

function AdminCourses() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [dialog, setDialog] = useState<{ kind: 'add' | 'edit' | 'manage'; row?: AdminCourseRow } | null>(null);
  const loading = useSimulatedLoad();

  const rows = useMemo(() => adminCourses.filter(row => {
    const matchesFilter = filter === 'All' || row.status === filter;
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || `${row.title} ${row.id} ${row.category}`.toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  }), [query, filter]);

  return <AdminShell title="Courses">
    <div className="page-heading">
      <div>
        <h1>Course catalogue</h1>
        <p className="subtitle">Manage the courses assigned to learners across the organisation.</p>
      </div>
      <Button onClick={() => setDialog({ kind: 'add' })}><Plus size={16} />Add course</Button>
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
          placeholder="Search courses…"
          aria-label="Search courses"
          className="w-full bg-transparent text-[12px] outline-none placeholder:text-muted-foreground"
        />
      </label>
    </div>

    {loading ? <TableSkeleton rows={6} cols={6} /> : <div className="table-wrap">
      <table className="training-table courses-table">
        <thead>
          <tr>
            <th>Course</th>
            <th className="col-category">Category</th>
            <th className="num">Enrolled learners</th>
            <th>Completion rate</th>
            <th>Status</th>
            <th className="num">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => <tr key={row.id}>
            <td>
              <div className="table-course">
                <span className="table-course-icon"><BookOpen size={16} /></span>
                <div><strong>{row.title}</strong><small>{row.id}</small></div>
              </div>
            </td>
            <td className="col-category" data-label="Category">{row.category}</td>
            <td className="num font-medium" data-label="Enrolled learners">{row.enrolled}</td>
            <td data-label="Completion rate">
              <div className="table-progress">
                <div className="progress-track" role="progressbar" aria-label={`${row.title} completion rate`} aria-valuenow={row.completionRate} aria-valuemin={0} aria-valuemax={100}>
                  <div className={`progress-fill ${row.completionRate >= 90 ? 'p100' : ''}`} style={row.completionRate > 0 ? { width: `${row.completionRate}%` } : undefined} />
                </div>
                <span>{row.completionRate}%</span>
              </div>
            </td>
            <td data-label="Status"><span className={`badge ${statusBadgeClass(row.status)}`}>{row.status}</span></td>
            <td data-label="Actions">
              <div className="courses-actions">
                <Button variant="ghost" size="sm" className="action-btn" asChild>
                  <Link to="/admin/courses/$courseId" params={{ courseId: row.id }} aria-label={`View ${row.title}`}><Eye size={14} /><span>View</span></Link>
                </Button>
                <Button variant="ghost" size="sm" className="action-btn" aria-label={`Edit ${row.title}`} onClick={() => setDialog({ kind: 'edit', row })}><Pencil size={14} /><span>Edit</span></Button>
                <Button variant="ghost" size="sm" className="action-btn" aria-label={`Manage ${row.title}`} onClick={() => setDialog({ kind: 'manage', row })}><Settings2 size={14} /><span>Manage</span></Button>
              </div>
            </td>
          </tr>)}
          {rows.length === 0 && (
            <tr><td colSpan={6}><EmptyState icon={<Search size={22} />} title="No courses found" description="Try a different search term or filter." action={<Button variant="outline" size="sm" onClick={() => { setQuery(''); setFilter('All'); }}>Clear filters</Button>} /></td></tr>
          )}
        </tbody>
      </table>
    </div>}

    <CourseFormDialog open={dialog?.kind === 'add' || dialog?.kind === 'edit'} onOpenChange={o => !o && setDialog(null)} mode={dialog?.kind === 'edit' ? 'edit' : 'add'}
      {...(dialog?.row ? { initial: { title: dialog.row.title, category: dialog.row.category, status: dialog.row.status } } : {})} />
    <EnrollmentDialog open={dialog?.kind === 'manage'} onOpenChange={o => !o && setDialog(null)} noun="learner" subject={dialog?.row?.title ?? ''}
      enrolled={dialog?.row ? courseEnrollments(dialog.row.id).slice(0, 4).map(e => ({ id: e.learner, label: e.learner, meta: e.department })) : []}
      available={adminLearners.map(l => ({ id: l.name, label: l.name, meta: l.department }))} />

    <div className="flex items-center gap-3 mt-5 text-[11px] text-muted-foreground">
      <ShieldCheck size={16} className="text-primary" />
      <span>Sample data only — Edit and Manage are demonstrations in this preview.</span>
    </div>
  </AdminShell>;
}
