import Link from 'next/link';
import { CalendarDays, Clock3, Layers, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { statusClass } from '@/lib/format';
import type { LearnerCourse } from '@/lib/types';
import { CoursePhoto } from '../course-photo';

export function CourseHero({ course }: { course: LearnerCourse }) {
  const started = course.status !== 'Not started';
  return <article className="featured-course">
    <CoursePhoto preload />
    <div className="featured-body">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="eyebrow">{course.category} · {course.code}</span>
        <span className={`badge ${statusClass(course.status)}`}>{course.status}</span>
      </div>
      <h1 className="featured-title">{course.title}</h1>
      <p className="course-detail-desc">{course.description}</p>
      <div className="course-meta mt-4">
        {course.modules.length > 0 && <span><Layers size={13}/>{course.modules.length} module{course.modules.length === 1 ? '' : 's'}</span>}
        <span><Clock3 size={13}/>{course.duration}</span>
        {course.due && <span><CalendarDays size={13}/>Due {course.due}</span>}
      </div>
      <div className="featured-footer">
        <span className="text-[10px] text-muted-foreground">{started ? 'Your progress is saved automatically' : 'Opens in the course player'}</span>
        {course.canLaunch
          ? <Button asChild>
            <Link href={`/courses/${course.id}/play`}>
              <Play size={14}/>{course.status === 'Completed' ? 'Review course' : started ? 'Continue training' : 'Start training'}
            </Link>
          </Button>
          : <span className="badge">Content not yet available</span>}
      </div>
    </div>
  </article>;
}
