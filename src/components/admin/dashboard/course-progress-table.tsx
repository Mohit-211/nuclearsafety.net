import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { TableProgress } from '@/components/shared/progress-track';
import type { AdminCourseRow } from '@/lib/types';

export function CourseProgressTable({ rows }: { rows: AdminCourseRow[] }) {
  return <section>
    <div className="section-heading"><h2>Course progress overview</h2><span className="text-xs text-muted-foreground">{rows.length} course{rows.length === 1 ? '' : 's'}</span></div>
    <div className="table-wrap"><table className="training-table">
      <thead><tr><th>Course</th><th className="num">Enrolled</th><th className="num">In progress</th><th className="num">Completed</th><th>Average progress</th></tr></thead>
      <tbody>
        {rows.map(row => <tr key={row.id}>
          <td><Link href={`/admin/courses/${row.id}`} className="table-course"><span className="table-course-icon"><BookOpen size={16} /></span><div><strong>{row.title}</strong><small>{row.code} · {row.status}</small></div></Link></td>
          <td className="num">{row.enrolled}</td>
          <td className="num">{row.inProgress}</td>
          <td className="num">{row.completed}</td>
          <td><TableProgress value={row.avgProgress} label={`${row.title} average progress`} /></td>
        </tr>)}
        {rows.length === 0 && <tr><td colSpan={5}><div className="empty-state"><BookOpen size={28} /><p>No courses yet.</p></div></td></tr>}
      </tbody>
    </table></div>
  </section>;
}
