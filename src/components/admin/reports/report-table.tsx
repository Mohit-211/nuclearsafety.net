import { ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableProgress } from '@/components/shared/progress-track';
import { EmptyState } from '@/components/shared/states';
import { statusClass } from '@/lib/format';
import type { ReportRow } from '@/lib/types';

export function ReportTable({ rows, showOrganization, onResetFilters }: { rows: ReportRow[]; showOrganization: boolean; onResetFilters: () => void }) {
  return <div className="table-wrap">
    <table className="training-table courses-table">
      <thead>
        <tr>
          <th>Learner</th>
          <th className="col-course-name">Course</th>
          <th>Progress</th>
          <th className="col-score num">Score</th>
          <th>Result</th>
          <th>Status</th>
          <th className="col-activity">Completion date</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={`${row.email}-${row.courseId}-${i}`}>
            <td>
              <div className="table-course">
                <span className="table-course-icon learner-icon"><Users size={15} /></span>
                <div><strong>{row.learner}</strong><small>{showOrganization ? row.organization ?? 'Individual' : row.department}</small></div>
              </div>
            </td>
            <td className="col-course-name" data-label="Course">{row.course}<small className="block text-[10px] text-muted-foreground">{row.courseCode}{row.versionNumber ? ` · v${row.versionNumber}` : ''}</small></td>
            <td data-label="Progress"><TableProgress value={row.progress} label={`${row.learner} progress in ${row.course}`} /></td>
            <td className="col-score num font-medium" data-label="Score">{row.score === null ? '—' : `${row.score}%`}</td>
            <td data-label="Result">{row.result ? <span className={`badge ${statusClass(row.result)}`}>{row.result}</span> : '—'}</td>
            <td data-label="Status"><span className={`badge ${statusClass(row.status)}`}>{row.status}</span></td>
            <td className="col-activity" data-label="Completion date">{row.status === 'Completed' ? row.date : '—'}</td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr><td colSpan={7}><EmptyState icon={<ShieldCheck size={22} />} title="No report results" description="No training records match the selected filters." action={<Button variant="outline" size="sm" onClick={onResetFilters}>Reset filters</Button>} /></td></tr>
        )}
      </tbody>
    </table>
  </div>;
}
