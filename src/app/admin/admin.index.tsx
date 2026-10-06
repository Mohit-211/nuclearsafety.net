import { createFileRoute } from '@tanstack/react-router';
import { Users, BookOpen, CheckCircle2, TrendingUp, CalendarDays, ShieldCheck } from 'lucide-react';
import { AdminShell } from '@/components/training/admin-shell';
import { adminOverview, courseOverview, recentActivity, activityStatusClass } from '@/components/training/admin-data';

export const Route = createFileRoute('/admin/')({
  head: () => ({ meta: [
    { title: 'Admin Dashboard | nuclearsafety.net' },
    { name: 'description', content: 'Operational overview of learners, courses and training completion.' },
    { property: 'og:title', content: 'Admin Dashboard | nuclearsafety.net' },
    { property: 'og:description', content: 'Operational overview of learners, courses and training completion.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const stats = [
    { label: 'Total learners', value: String(adminOverview.totalLearners), note: 'Across all departments', icon: Users, tone: '' },
    { label: 'Active courses', value: String(adminOverview.activeCourses), note: 'Published in the catalogue', icon: BookOpen, tone: '' },
    { label: 'Courses completed', value: String(adminOverview.completedCourses), note: 'All-time completions', icon: CheckCircle2, tone: 'success' },
    { label: 'Completion rate', value: `${adminOverview.completionRate}%`, note: 'Average across active courses', icon: TrendingUp, tone: 'warning' },
  ];
  return <AdminShell title="Dashboard">
    <div className="page-heading">
      <div><h1>Training overview</h1><p className="subtitle">A concise view of learner activity and course completion across the organisation.</p></div>
      <div className="date-label"><CalendarDays size={15} />Tuesday, 6 October 2026</div>
    </div>
    <div className="stats-grid">
      {stats.map(({ label, value, note, icon: Icon, tone }) => <div className="stat" key={label}>
        <div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}><Icon size={17} /></span></div>
        <div className="stat-value">{value}</div>
        <div className="stat-note">{note}</div>
      </div>)}
    </div>
    <section>
      <div className="section-heading"><h2>Course progress overview</h2><span className="text-xs text-muted-foreground">{adminOverview.activeCourses} active courses</span></div>
      <div className="table-wrap"><table className="training-table">
        <thead><tr><th>Course</th><th className="num">Enrolled</th><th className="num">In progress</th><th className="num">Completed</th><th>Average progress</th></tr></thead>
        <tbody>{courseOverview.map(row => <tr key={row.id}>
          <td><div className="table-course"><span className="table-course-icon"><BookOpen size={16} /></span><div><strong>{row.title}</strong><small>{row.id}</small></div></div></td>
          <td className="num">{row.enrolled}</td>
          <td className="num">{row.inProgress}</td>
          <td className="num">{row.completed}</td>
          <td><div className="table-progress"><div className="progress-track" role="progressbar" aria-label={`${row.title} average progress`} aria-valuenow={row.avgProgress} aria-valuemin={0} aria-valuemax={100}><div className={`progress-fill ${row.avgProgress === 100 ? 'p100' : ''}`} style={row.avgProgress > 0 ? { width: `${row.avgProgress}%` } : undefined} /></div><span>{row.avgProgress}%</span></div></td>
        </tr>)}</tbody>
      </table></div>
    </section>
    <section className="training-section">
      <div className="section-heading"><h2>Recent activity</h2><span className="text-xs text-muted-foreground">Last 7 days</span></div>
      <div className="table-wrap"><table className="training-table">
        <thead><tr><th>Learner</th><th>Activity</th><th>Course</th><th>Date</th><th>Status</th></tr></thead>
        <tbody>{recentActivity.map(row => <tr key={`${row.learner}-${row.course}-${row.date}`}>
          <td className="font-medium">{row.learner}</td>
          <td>{row.action}</td>
          <td>{row.course}</td>
          <td className="whitespace-nowrap">{row.date}</td>
          <td><span className={`badge ${activityStatusClass(row.status)}`}>{row.status}</span></td>
        </tr>)}</tbody>
      </table></div>
    </section>
    <div className="flex items-center gap-3 mt-5 text-[11px] text-muted-foreground"><ShieldCheck size={16} className="text-primary" /><span>Sample data only — no live learner records are connected.</span></div>
  </AdminShell>;
}
