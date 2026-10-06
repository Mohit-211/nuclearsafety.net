import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CourseTable } from '@/components/courses/course-table';
import type { LearnerCourse } from '@/lib/types';

export function AssignedTraining({ courses }: { courses: LearnerCourse[] }) {
  // Outstanding training first, mandatory before optional, then by due date.
  const assigned = [...courses].sort((a, b) =>
    Number(a.status === 'Completed') - Number(b.status === 'Completed')
    || Number(b.isMandatory) - Number(a.isMandatory)
    || (a.daysUntilDue ?? 9999) - (b.daysUntilDue ?? 9999)).slice(0, 6);
  if (!courses.length) return null;
  return <section className="training-section">
    <div className="section-heading">
      <h2>
        My assigned training{' '}
        <span className="text-xs font-normal text-muted-foreground ml-1">{courses.length} course{courses.length === 1 ? '' : 's'}</span>
      </h2>
      <Link href="/my-training" className="text-link">View all <ArrowRight size={14} /></Link>
    </div>
    <CourseTable items={assigned} />
  </section>;
}
