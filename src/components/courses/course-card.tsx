import Link from 'next/link';
import { ArrowRight, BookOpen, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressTrack, pct } from '@/components/shared/progress-track';
import { statusClass } from '@/lib/format';
import type { LearnerCourse } from '@/lib/types';

/** Assigned-course card with progress, used on "My courses". */
export function CourseCard({ course: c }: { course: LearnerCourse }) {
  const started = c.status !== 'Not started';
  const overdue = c.status !== 'Completed' && c.daysUntilDue !== null && c.daysUntilDue < 0;
  return <article className="course-card">
    <div className="course-card-top"><span className={`badge ${statusClass(c.status)}`}>{c.status}</span><span className="course-card-cat">{c.category}</span></div>
    <h2>{c.title}</h2>
    <p className="course-card-desc">{c.description}</p>
    <div className="course-card-progress"><ProgressTrack value={c.progress} label={`${c.title} progress`} /><span className="course-card-pct">{pct(c.progress)}</span></div>
    <div className="course-card-footer">
      <span className={`course-card-due ${overdue ? 'text-warning' : ''}`}>{c.status === 'Completed' ? `Completed ${c.completedOn ?? ''}` : c.due ? `${overdue ? 'Overdue' : 'Due'} ${c.due}` : 'No due date'}</span>
      <Button size="sm" variant={started ? 'default' : 'outline'} asChild>
        <Link href={`/courses/${c.id}`}>{c.status === 'Completed' ? 'Review course' : started ? 'Continue course' : 'View course'}</Link>
      </Button>
    </div>
  </article>;
}

/** Catalogue card, used on the course library. */
export function CatalogCard({ course: c }: { course: LearnerCourse }) {
  return <article className="catalog-card">
    <div className="catalog-icon"><BookOpen size={32} strokeWidth={1.3}/></div>
    <div className="catalog-card-body">
      <span className={`badge ${statusClass(c.status)}`}>{c.status}</span>
      <h2>{c.title}</h2>
      <div className="course-meta"><span><Clock3 size={13}/>{c.duration}</span>{c.modules.length > 0 && <span>{c.modules.length} module{c.modules.length === 1 ? '' : 's'}</span>}</div>
      <Button className="mt-5" variant="outline" size="sm" asChild><Link href={`/courses/${c.id}`}>View course <ArrowRight/></Link></Button>
    </div>
  </article>;
}
