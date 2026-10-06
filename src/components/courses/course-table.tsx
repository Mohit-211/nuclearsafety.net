import Link from 'next/link';
import { BookOpen, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableProgress } from '@/components/shared/progress-track';
import { statusClass } from '@/lib/format';
import type { LearnerCourse } from '@/lib/types';

export function CourseTable({ items }: { items: LearnerCourse[] }) {
  return <div className="table-wrap"><table className="training-table">
    <thead><tr><th>Course</th><th>Status</th><th>Progress</th><th>Due</th><th aria-label="Actions"/></tr></thead>
    <tbody>{items.map(c => <tr key={c.id}>
      <td><div className="table-course"><span className="table-course-icon"><BookOpen size={16}/></span><div><strong>{c.title}</strong><small>{c.code} · {c.category}</small></div></div></td>
      <td><span className={`badge ${statusClass(c.status)}`}>{c.status}</span></td>
      <td><TableProgress value={c.progress} label={`${c.title} progress`} /></td>
      <td className="whitespace-nowrap">{c.due ?? '—'}</td>
      <td className="text-right"><Button size="sm" variant="outline" asChild><Link href={`/courses/${c.id}`}>Open <ArrowRight size={13}/></Link></Button></td>
    </tr>)}</tbody>
  </table></div>;
}
