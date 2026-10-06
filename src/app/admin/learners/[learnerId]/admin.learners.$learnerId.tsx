import { useState } from 'react';
import { EnrollmentDialog } from '@/components/training/admin-dialogs';
import { adminCourses } from '@/components/training/admin-data';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { ArrowLeft, History, Pencil, UserPlus, Users } from 'lucide-react';
import { AdminShell } from '@/components/training/admin-shell';
import {
  adminLearners,
  learnerActivity,
  learnerEnrollments,
  learnerStatusClass,
  activityStatusClass,
  enrollmentStatusClass,
} from '@/components/training/admin-data';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/admin/learners/$learnerId')({
  loader: ({ params }) => {
    const learner = adminLearners.find(l => l.id === params.learnerId);
    if (!learner) throw notFound();
    return { learner };
  },
  head: ({ loaderData }) => loaderData
    ? { meta: [
        { title: `${loaderData.learner.name} — Learner detail | nuclearsafety.net` },
        { name: 'description', content: `Administration overview for the learner account of ${loaderData.learner.name}.` },
        { property: 'og:title', content: `${loaderData.learner.name} — Learner detail | nuclearsafety.net` },
        { property: 'og:description', content: `Administration overview for the learner account of ${loaderData.learner.name}.` },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ] }
    : { meta: [{ title: 'Learner unavailable | nuclearsafety.net' }, { name: 'robots', content: 'noindex' }] },
  component: AdminLearnerDetail,
  notFoundComponent: AdminLearnerNotFound,
});

function initials(name: string) {
  return name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase();
}

function AdminLearnerDetail() {
  const { learner } = Route.useLoaderData();
  const enrollments = learnerEnrollments(learner.id);
  const activity = learnerActivity(learner.id);
  const [note, setNote] = useState<'edit' | 'enroll' | null>(null);

  const completed = enrollments.filter(e => e.status === 'Completed').length;
  const inProgress = enrollments.filter(e => e.status === 'In progress').length;
  const notStarted = enrollments.filter(e => e.status === 'Not started').length;

  const infoRows: Array<[string, React.ReactNode]> = [
    ['Learner ID', learner.id],
    ['Employee ID', `NS-${2417 + Number(learner.id.slice(2))}`],
    ['Email', learner.email],
    ['Department', learner.department],
    ['Last activity', learner.lastActivity],
    ['Account status', <span key="status" className={`badge ${learnerStatusClass(learner.status)}`}>{learner.status}</span>],
  ];

  return <AdminShell title="Learner detail">
    <Link to="/admin/learners" className="text-link text-[11px] inline-flex items-center gap-1.5 mb-4"><ArrowLeft size={13} />Back to learners</Link>

    <div className="page-heading">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="avatar learner-avatar" aria-hidden="true">{initials(learner.name)}</span>
          <h1>{learner.name}</h1>
          <span className={`badge ${learnerStatusClass(learner.status)}`}>{learner.status}</span>
        </div>
        <p className="subtitle">{learner.email} · {learner.department}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setNote('edit')}><Pencil size={15} />Edit learner</Button>
        <Button onClick={() => setNote('enroll')}><UserPlus size={15} />Manage enrollment</Button>
      </div>
    </div>

    {note === 'edit' && (
      <div className="dialog-note mb-6" role="status">Learner editing is a preview action — nothing is stored in this preview.</div>
    )}
    <EnrollmentDialog open={note === 'enroll'} onOpenChange={o => !o && setNote(null)} noun="course" subject={learner.name}
      enrolled={enrollments.map(e => ({ id: e.courseId, label: e.title, meta: e.status }))}
      available={adminCourses.map(c => ({ id: c.id, label: c.title, meta: c.category }))} />

    <div className="admin-course-grid">
      <section className="detail-panel" aria-labelledby="learner-info-heading">
        <h2 id="learner-info-heading">Profile information</h2>
        <dl className="mt-3">
          {infoRows.map(([label, value]) => (
            <div className="detail-info-row" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="detail-panel" aria-labelledby="learner-progress-heading">
        <h2 id="learner-progress-heading">Training progress</h2>
        <p className="detail-muted">Average progress across assigned courses.</p>
        <div className="progress-label">
          <span>Average progress</span>
          <span>{learner.progress}%</span>
        </div>
        <div className="progress-track" role="progressbar" aria-label={`${learner.name} average progress`} aria-valuenow={learner.progress} aria-valuemin={0} aria-valuemax={100}>
          <div className={`progress-fill ${learner.progress >= 90 ? 'p100' : ''}`} style={learner.progress > 0 ? { width: `${learner.progress}%` } : undefined} />
        </div>
        <div className="admin-progress-summary">
          <div className="admin-progress-item">
            <span className="admin-progress-num">{completed}</span>
            <span className="admin-progress-label">Courses completed</span>
          </div>
          <div className="admin-progress-item">
            <span className="admin-progress-num">{inProgress}</span>
            <span className="admin-progress-label">In progress</span>
          </div>
          <div className="admin-progress-item">
            <span className="admin-progress-num">{notStarted}</span>
            <span className="admin-progress-label">Not started</span>
          </div>
        </div>
      </section>
    </div>

    <section className="training-section" aria-labelledby="enrolled-heading">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 id="enrolled-heading" className="text-[15px] font-semibold">Enrolled courses</h2>
        <span className="text-[11px] text-muted-foreground">{enrollments.length} assigned course{enrollments.length === 1 ? '' : 's'}</span>
      </div>
      <div className="table-wrap">
        <table className="training-table courses-table">
          <thead>
            <tr>
              <th>Course</th>
              <th className="col-category">Category</th>
              <th>Enrolled on</th>
              <th>Progress</th>
              <th>Status</th>
              <th className="col-activity">Completed on</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map(row => <tr key={row.courseId}>
              <td data-label="Course"><strong className="font-medium">{row.title}</strong></td>
              <td className="col-category" data-label="Category">{row.category}</td>
              <td data-label="Enrolled on">{row.enrolledOn}</td>
              <td data-label="Progress">
                <div className="table-progress">
                  <div className="progress-track" role="progressbar" aria-label={`${row.title} progress`} aria-valuenow={row.progress} aria-valuemin={0} aria-valuemax={100}>
                    <div className={`progress-fill ${row.progress === 100 ? 'p100' : ''}`} style={row.progress > 0 ? { width: `${row.progress}%` } : undefined} />
                  </div>
                  <span>{row.progress}%</span>
                </div>
              </td>
              <td data-label="Status"><span className={`badge ${enrollmentStatusClass(row.status)}`}>{row.status}</span></td>
              <td className="col-activity" data-label="Completed on">{row.completedOn ?? '—'}</td>
            </tr>)}
            {enrollments.length === 0 && (
              <tr><td colSpan={6}><div className="empty-state"><Users size={28} /><p>No courses assigned to this learner.</p></div></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>

    <section className="training-section" aria-labelledby="activity-heading">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 id="activity-heading" className="text-[15px] font-semibold">Recent activity</h2>
        <span className="text-[11px] text-muted-foreground">Latest {activity.length} recorded events</span>
      </div>
      <div className="table-wrap">
        <table className="training-table courses-table">
          <thead>
            <tr>
              <th>Activity</th>
              <th>Course</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {activity.map((row, i) => <tr key={`${row.action}-${i}`}>
              <td data-label="Activity"><strong className="font-medium">{row.action}</strong></td>
              <td data-label="Course">{row.course}</td>
              <td data-label="Date">{row.date}</td>
              <td data-label="Status"><span className={`badge ${activityStatusClass(row.status)}`}>{row.status}</span></td>
            </tr>)}
            {activity.length === 0 && (
              <tr><td colSpan={4}><div className="empty-state"><History size={28} /><p>No recent activity recorded.</p></div></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 mt-5 text-[11px] text-muted-foreground">
        <Users size={16} className="text-primary" />
        <span>Sample data only — learner records are demonstrations in this preview.</span>
      </div>
    </section>
  </AdminShell>;
}

function AdminLearnerNotFound() {
  return <AdminShell title="Learner detail">
    <div className="empty-state">
      <Users size={30} />
      <p>This learner account is not in the register.</p>
      <Button variant="outline" className="mt-4" asChild>
        <Link to="/admin/learners">Back to learners</Link>
      </Button>
    </div>
  </AdminShell>;
}
