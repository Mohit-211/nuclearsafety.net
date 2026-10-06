import { BookOpen, ShieldCheck } from 'lucide-react';
import { ProgressTrack, pct } from '@/components/shared/progress-track';
import type { LearnerCourse } from '@/lib/types';

export function CourseSidebar({ course }: { course: LearnerCourse }) {
  const info: [string, string][] = [
    ['Category', course.category],
    ['Estimated duration', course.duration],
    ['Due date', course.due ?? 'No due date'],
    ['Status', course.status],
    ...(course.score !== null ? [['Score', `${course.score}%`] as [string, string]] : []),
    ...(course.result ? [['Result', course.result] as [string, string]] : []),
    ...(course.completedOn ? [['Completed on', course.completedOn] as [string, string]] : []),
    ['Mandatory', course.isMandatory ? 'Yes' : 'No'],
  ];
  return <div className="space-y-5">
    <section className="detail-panel">
      <h2 className="mb-2">Course progress</h2>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="detail-progress-pct">{course.progress === null ? course.status : pct(course.progress)}</span>
        {course.progress !== null && <span className="text-[11px] text-muted-foreground">complete</span>}
      </div>
      <ProgressTrack value={course.progress} label={`${course.title} progress`} />
      <p className="text-[11px] text-muted-foreground mt-3">{course.lastActivity ? `Last activity ${course.lastActivity}` : 'Not started yet'}</p>
    </section>
    <section className="detail-panel">
      <h2 className="mb-1">Course information</h2>
      <dl>{info.map(([label, value]) => <div className="detail-info-row" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </section>
    <div className="flex items-center gap-3 text-[11px] text-muted-foreground px-1"><BookOpen size={15} className="text-primary"/><span>Assigned by your training coordinator.</span></div>
    <div className="flex items-center gap-3 text-[11px] text-muted-foreground px-1"><ShieldCheck size={15} className="text-primary"/><span>A completion certificate is available once the course is completed.</span></div>
  </div>;
}
