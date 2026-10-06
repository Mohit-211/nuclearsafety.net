import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { TableProgress } from '@/components/shared/progress-track';
import { SectionHeader } from '@/components/admin/shared/detail-panels';
import { statusClass } from '@/lib/format';
import type { EnrollmentRow } from '@/lib/types';

export function CourseEnrollmentTable({ enrollments, showOrganization }: { enrollments: EnrollmentRow[]; showOrganization: boolean }) {
  return <section className="training-section" aria-labelledby="enrollment-heading">
    <SectionHeader id="enrollment-heading" title="Enrollment overview" meta={`${enrollments.length} enrolled learner${enrollments.length === 1 ? '' : 's'}`} />
    <div className="table-wrap">
      <table className="training-table courses-table">
        <thead>
          <tr>
            <th>Learner</th>
            <th className="col-category">{showOrganization ? 'Organization' : 'Department'}</th>
            <th>Enrolled on</th>
            <th>Due</th>
            <th>Progress</th>
            <th className="col-score num">Score</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {enrollments.map(row => <tr key={row.userId}>
            <td data-label="Learner"><Link href={`/admin/learners/${row.userId}`} className="font-medium hover:underline">{row.learner}</Link><small className="block text-muted-foreground text-[10px]">{row.email}</small></td>
            <td className="col-category" data-label={showOrganization ? 'Organization' : 'Department'}>{showOrganization ? row.organization ?? 'Individual' : row.department}</td>
            <td data-label="Enrolled on">{row.enrolledOn}</td>
            <td data-label="Due">{row.due ?? '—'}</td>
            <td data-label="Progress"><TableProgress value={row.progress} label={`${row.learner} progress`} /></td>
            <td className="col-score num" data-label="Score">{row.score === null ? '—' : `${row.score}%`}</td>
            <td data-label="Status"><span className={`badge ${statusClass(row.status)}`}>{row.status}</span></td>
          </tr>)}
          {enrollments.length === 0 && (
            <tr><td colSpan={7}><div className="empty-state"><BookOpen size={28} /><p>No learners enrolled yet.</p></div></td></tr>
          )}
        </tbody>
      </table>
    </div>
  </section>;
}
