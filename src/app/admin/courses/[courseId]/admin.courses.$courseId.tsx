import { useState } from 'react';
import { CourseFormDialog, EnrollmentDialog } from '@/components/training/admin-dialogs';
import { adminLearners } from '@/components/training/admin-data';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { ArrowLeft, BookOpen, Pencil, Users, UserPlus } from 'lucide-react';
import { AdminShell } from '@/components/training/admin-shell';
import { adminCourses, courseEnrollments, enrollmentStatusClass, courseOverview } from '@/components/training/admin-data';
import { courses } from '@/components/training/mock-data';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/admin/courses/$courseId')({
  loader: ({ params }) => {
    const course = adminCourses.find(c => c.id === params.courseId);
    if (!course) throw notFound();
    return { course };
  },
  head: ({ loaderData }) => loaderData
    ? { meta: [
        { title: `${loaderData.course.title} — Course detail | nuclearsafety.net` },
        { name: 'description', content: `Administration overview for the ${loaderData.course.title} training course.` },
        { property: 'og:title', content: `${loaderData.course.title} — Course detail | nuclearsafety.net` },
        { property: 'og:description', content: `Administration overview for the ${loaderData.course.title} training course.` },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ] }
    : { meta: [{ title: 'Course unavailable | nuclearsafety.net' }, { name: 'robots', content: 'noindex' }] },
  component: AdminCourseDetail,
  notFoundComponent: AdminCourseNotFound,
});

function statusBadgeClass(status: 'Published' | 'Draft') {
  return status === 'Published' ? 'completed' : '';
}

function AdminCourseDetail() {
  const { course } = Route.useLoaderData();
  const details = courses.find(c => c.id === course.id);
  const overview = courseOverview.find(c => c.id === course.id);
  const enrollments = courseEnrollments(course.id);
  const [note, setNote] = useState<'edit' | 'enroll' | null>(null);

  const infoRows: Array<[string, React.ReactNode]> = [
    ['Course ID', course.id],
    ['Category', course.category],
    ['Description', details?.description ?? '—'],
    ['Estimated duration', details?.duration ?? '—'],
    ['Modules', details ? `${details.modules}` : '—'],
    ['Status', <span key="status" className={`badge ${statusBadgeClass(course.status)}`}>{course.status}</span>],
    ['Mandatory', details?.required ? 'Yes' : 'No'],
  ];

  const stats = [
    { label: 'Enrolled learners', value: course.enrolled, note: 'Assigned to this course' },
    { label: 'In progress', value: overview?.inProgress ?? 0, note: 'Currently working through the course' },
    { label: 'Completed', value: overview?.completed ?? 0, note: 'Finished all modules' },
    { label: 'Completion rate', value: `${course.completionRate}%`, note: 'Across all enrolled learners' },
  ];

  return <AdminShell title="Course detail">
    <Link to="/admin/courses" className="text-link text-[11px] inline-flex items-center gap-1.5 mb-4"><ArrowLeft size={13} />Back to courses</Link>

    <div className="page-heading">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1>{course.title}</h1>
          <span className={`badge ${statusBadgeClass(course.status)}`}>{course.status}</span>
        </div>
        <p className="subtitle">{course.id} · {course.category}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setNote('edit')}><Pencil size={15} />Edit course</Button>
        <Button onClick={() => setNote('enroll')}><UserPlus size={15} />Manage enrollments</Button>
      </div>
    </div>

    <CourseFormDialog open={note === 'edit'} onOpenChange={o => !o && setNote(null)} mode="edit" initial={{ title: course.title, category: course.category, status: course.status, duration: details?.duration ?? '' }} />
    <EnrollmentDialog open={note === 'enroll'} onOpenChange={o => !o && setNote(null)} noun="learner" subject={course.title}
      enrolled={enrollments.map(e => ({ id: e.learner, label: e.learner, meta: e.department }))}
      available={adminLearners.map(l => ({ id: l.name, label: l.name, meta: l.department }))} />

    <div className="stats-grid">
      {stats.map(s => (
        <div className="stat" key={s.label}>
          <div className="stat-top"><span>{s.label}</span><span className="stat-icon"><Users size={16} /></span></div>
          <div className="stat-value">{s.value}</div>
          <div className="stat-note">{s.note}</div>
        </div>
      ))}
    </div>

    <div className="admin-course-grid">
      <section className="detail-panel" aria-labelledby="course-info-heading">
        <h2 id="course-info-heading">Course information</h2>
        <dl className="mt-3">
          {infoRows.map(([label, value]) => (
            <div className="detail-info-row" key={label}>
              <dt>{label}</dt>
              <dd className={label === 'Description' ? 'detail-desc' : ''}>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="detail-panel" aria-labelledby="completion-heading">
        <h2 id="completion-heading">Completion progress</h2>
        <p className="detail-muted">Overall completion across enrolled learners.</p>
        <div className="progress-label">
          <span>Course completion</span>
          <span>{course.completionRate}%</span>
        </div>
        <div className="progress-track" role="progressbar" aria-label="Course completion rate" aria-valuenow={course.completionRate} aria-valuemin={0} aria-valuemax={100}>
          <div className={`progress-fill ${course.completionRate >= 90 ? 'p100' : ''}`} style={course.completionRate > 0 ? { width: `${course.completionRate}%` } : undefined} />
        </div>
        <div className="admin-progress-summary">
          <div className="admin-progress-item">
            <span className="admin-progress-num">{overview?.completed ?? 0}</span>
            <span className="admin-progress-label">Learners completed</span>
          </div>
          <div className="admin-progress-item">
            <span className="admin-progress-num">{overview?.inProgress ?? 0}</span>
            <span className="admin-progress-label">Learners in progress</span>
          </div>
          <div className="admin-progress-item">
            <span className="admin-progress-num">{course.enrolled - (overview?.completed ?? 0) - (overview?.inProgress ?? 0)}</span>
            <span className="admin-progress-label">Not started</span>
          </div>
        </div>
      </section>
    </div>

    <section className="training-section" aria-labelledby="enrollment-heading">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 id="enrollment-heading" className="text-[15px] font-semibold">Enrollment overview</h2>
        <span className="text-[11px] text-muted-foreground">Showing {enrollments.length} of {course.enrolled} enrolled learners</span>
      </div>
      <div className="table-wrap">
        <table className="training-table courses-table">
          <thead>
            <tr>
              <th>Learner</th>
              <th className="col-category">Department</th>
              <th>Enrolled on</th>
              <th>Progress</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map(row => <tr key={row.learner}>
              <td data-label="Learner"><strong className="font-medium">{row.learner}</strong></td>
              <td className="col-category" data-label="Department">{row.department}</td>
              <td data-label="Enrolled on">{row.enrolledOn}</td>
              <td data-label="Progress">
                <div className="table-progress">
                  <div className="progress-track" role="progressbar" aria-label={`${row.learner} progress`} aria-valuenow={row.progress} aria-valuemin={0} aria-valuemax={100}>
                    <div className={`progress-fill ${row.progress === 100 ? 'p100' : ''}`} style={row.progress > 0 ? { width: `${row.progress}%` } : undefined} />
                  </div>
                  <span>{row.progress}%</span>
                </div>
              </td>
              <td data-label="Status"><span className={`badge ${enrollmentStatusClass(row.status)}`}>{row.status}</span></td>
            </tr>)}
            {enrollments.length === 0 && (
              <tr><td colSpan={5}><div className="empty-state"><BookOpen size={28} /><p>No learners enrolled yet.</p></div></td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 mt-5 text-[11px] text-muted-foreground">
        <BookOpen size={16} className="text-primary" />
        <span>Sample data only — enrollment records are demonstrations in this preview.</span>
      </div>
    </section>
  </AdminShell>;
}

function AdminCourseNotFound() {
  return <AdminShell title="Course detail">
    <div className="empty-state">
      <BookOpen size={30} />
      <p>This course is not in the catalogue.</p>
      <Button variant="outline" className="mt-4" asChild>
        <Link to="/admin/courses">Back to courses</Link>
      </Button>
    </div>
  </AdminShell>;
}
