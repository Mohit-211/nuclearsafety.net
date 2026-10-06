import Link from 'next/link';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableProgress } from '@/components/shared/progress-track';
import { EmptyState } from '@/components/shared/states';
import { statusClass } from '@/lib/format';
import type { AdminLearnerRow } from '@/lib/types';

export function LearnersTable({ rows, showOrganization, onClearFilters }: { rows: AdminLearnerRow[]; showOrganization: boolean; onClearFilters?: () => void }) {
  return <div className="table-wrap">
    <table className="training-table courses-table">
      <thead>
        <tr>
          <th>Learner</th>
          <th className="col-email">Email</th>
          <th className="num">Assigned courses</th>
          <th>Progress</th>
          <th>Status</th>
          <th className="col-activity">Last activity</th>
          <th className="num">Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => <tr key={row.id}>
          <td>
            <div className="table-course">
              <span className="table-course-icon learner-icon"><Users size={15} /></span>
              <div><strong>{row.name}</strong><small>{showOrganization ? `${row.roleLabel}${row.organization ? ` · ${row.organization}` : ''}` : `${row.department}${row.roleLabel === 'Corporate admin' ? ' · Admin' : ''}`}</small></div>
            </div>
          </td>
          <td className="col-email" data-label="Email">{row.email}</td>
          <td className="num font-medium" data-label="Assigned courses">{row.courseIds.length}</td>
          <td data-label="Progress"><TableProgress value={row.progress} label={`${row.name} average progress`} /></td>
          <td data-label="Status"><span className={`badge ${statusClass(row.status)}`}>{row.status}</span></td>
          <td className="col-activity" data-label="Last activity">{row.lastActivity}</td>
          <td data-label="Actions">
            <div className="courses-actions">
              <Button variant="ghost" size="sm" className="action-btn" asChild>
                <Link href={`/admin/learners/${row.id}`} aria-label={`View ${row.name}`}><span>View learner</span></Link>
              </Button>
            </div>
          </td>
        </tr>)}
        {rows.length === 0 && (
          <tr><td colSpan={7}><EmptyState icon={<Users size={22} />} title="No learners found" description={onClearFilters ? 'Try a different search term or filter.' : 'No accounts yet.'}
            action={onClearFilters && <Button variant="outline" size="sm" onClick={onClearFilters}>Clear filters</Button>} /></td></tr>
        )}
      </tbody>
    </table>
  </div>;
}
