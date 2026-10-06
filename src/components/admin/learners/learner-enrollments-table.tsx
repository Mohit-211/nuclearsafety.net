import Link from 'next/link';
import { Users } from 'lucide-react';
import { TableProgress } from '@/components/shared/progress-track';
import { SectionHeader } from '@/components/admin/shared/detail-panels';
import { statusClass } from '@/lib/format';
import type { LearnerEnrollmentRow } from '@/lib/types';

export function LearnerEnrollmentsTable({ enrollments }: { enrollments: LearnerEnrollmentRow[] }) {
  return <section className="training-section" aria-labelledby="enrolled-heading">
    <SectionHeader id="enrolled-heading" title="Enrolled courses" meta={`${enrollments.length} assigned course${enrollments.length === 1 ? '' : 's'}`} />
    <div className="table-wrap">
      <table className="training-table courses-table">
        <thead>
          <tr>
            <th>Course</th>
            <th>Enrolled on</th>
            <th>Due</th>
            <th>Progress</th>
            <th className="col-score num">Score</th>
            <th>Status</th>
            <th className="col-activity">Completed on</th>
          </tr>
        </thead>
        <tbody>
          {enrollments.map(row => <tr key={row.courseId}>
            <td data-label="Course"><Link href={`/admin/courses/${row.courseId}`} className="font-medium hover:underline">{row.title}</Link>
              <small className="block text-muted-foreground text-[10px]">{row.code}{row.versionNumber ? ` · package v${row.versionNumber}` : ''}</small></td>
            <td data-label="Enrolled on">{row.enrolledOn}</td>
            <td data-label="Due">{row.due ?? '—'}</td>
            <td data-label="Progress"><TableProgress value={row.progress} label={`${row.title} progress`} /></td>
            <td className="col-score num" data-label="Score">{row.score === null ? '—' : `${row.score}%`}{row.result && <small className="block text-[10px] text-muted-foreground">{row.result}</small>}</td>
            <td data-label="Status"><span className={`badge ${statusClass(row.status)}`}>{row.status}</span></td>
            <td className="col-activity" data-label="Completed on">{row.completedOn ?? '—'}</td>
          </tr>)}
          {enrollments.length === 0 && (
            <tr><td colSpan={7}><div className="empty-state"><Users size={28} /><p>No courses assigned to this learner.</p></div></td></tr>
          )}
        </tbody>
      </table>
    </div>
  </section>;
}
