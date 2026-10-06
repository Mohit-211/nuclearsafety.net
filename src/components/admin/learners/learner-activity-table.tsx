import { History } from 'lucide-react';
import { SectionHeader } from '@/components/admin/shared/detail-panels';
import { statusClass } from '@/lib/format';
import type { ActivityRow } from '@/lib/types';

export function LearnerActivityTable({ activity }: { activity: ActivityRow[] }) {
  return <section className="training-section" aria-labelledby="activity-heading">
    <SectionHeader id="activity-heading" title="Recent activity" meta={`Latest ${activity.length} recorded events`} />
    <div className="table-wrap">
      <table className="training-table courses-table">
        <thead>
          <tr>
            <th>Activity</th>
            <th>Course</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {activity.map(row => <tr key={row.id}>
            <td data-label="Activity"><strong className="font-medium">{row.action}</strong></td>
            <td data-label="Course">{row.course}</td>
            <td data-label="Date">{row.date}</td>
            <td data-label="Status">{row.status !== 'Info' && <span className={`badge ${statusClass(row.status)}`}>{row.status}</span>}</td>
          </tr>)}
          {activity.length === 0 && (
            <tr><td colSpan={4}><div className="empty-state"><History size={28} /><p>No recent activity recorded.</p></div></td></tr>
          )}
        </tbody>
      </table>
    </div>
  </section>;
}
