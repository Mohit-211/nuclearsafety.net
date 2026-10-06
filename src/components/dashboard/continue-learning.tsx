import Link from 'next/link';
import { ArrowRight, BookOpen, Clock3, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressTrack, pct } from '@/components/shared/progress-track';
import { EmptyState } from '@/components/shared/states';
import { CoursePhoto } from '@/components/courses/course-photo';
import { statusClass } from '@/lib/format';
import type { LearnerCourse } from '@/lib/types';

/** Most recently active unfinished course, else the next course to start. */
function pick(courses: LearnerCourse[]) {
  const open = courses.filter(c => c.status !== 'Completed');
  const inProgress = open.filter(c => c.status === 'In progress').sort((a, b) => (b.lastActivityAt ?? 0) - (a.lastActivityAt ?? 0));
  return inProgress[0] ?? open.sort((a, b) => (a.daysUntilDue ?? 9999) - (b.daysUntilDue ?? 9999))[0] ?? null;
}

export function ContinueLearning({ courses }: { courses: LearnerCourse[] }) {
  const course = pick(courses);
  return <section>
    <div className="section-heading">
      <h2>Continue learning</h2>
      <Link href="/my-training" className="text-link">My training <ArrowRight size={14} /></Link>
    </div>
    {!course ? <div className="table-wrap"><EmptyState icon={<BookOpen size={22} />} title={courses.length ? 'All assigned training completed' : 'No courses assigned yet'}
      description={courses.length ? 'Well done — your certificates are available.' : 'Your training coordinator will assign courses here.'} /></div>
      : <article className="featured-course">
        <CoursePhoto preload />
        <div className="featured-body">
          <div className="flex items-center justify-between gap-2">
            <span className="eyebrow">{course.category} · {course.code}</span>
            <span className={`badge ${statusClass(course.status)}`}>{course.status}</span>
          </div>
          <h3 className="featured-title">{course.title}</h3>
          <div className="course-meta">
            {course.modules.length > 0 && <span><Layers size={13} />{course.modules.length} module{course.modules.length === 1 ? '' : 's'}</span>}
            <span><Clock3 size={13} />{course.duration}</span>
          </div>
          <div className="progress-label">
            <span>{course.status === 'Not started' ? 'Not started yet' : course.progress === null ? 'In progress' : 'Progress'}</span>
            <span className="font-semibold text-primary">{pct(course.progress)}</span>
          </div>
          <ProgressTrack value={course.progress} label={`${course.title} progress`} />
          <div className="featured-footer">
            <span className="text-[10px] text-muted-foreground">{course.due ? `Due ${course.due}` : 'No due date'}</span>
            <Button size="sm" asChild>
              <Link href={`/courses/${course.id}`}>{course.status === 'Not started' ? 'Start course' : 'Resume course'} <ArrowRight size={14} /></Link>
            </Button>
          </div>
        </div>
      </article>}
  </section>;
}
