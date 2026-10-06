import { History } from 'lucide-react';
import { statusClass } from '@/lib/format';
import type { ActivityRow } from '@/lib/types';

export function RecentActivityTable({ rows }: { rows: ActivityRow[] }) {
  return <section className="training-section">
    <div className="section-heading"><h2>Recent activity</h2><span className="text-xs text-muted-foreground">Latest {rows.length} events</span></div>
    <div className="table-wrap"><table className="training-table">
      <thead><tr><th>Learner</th><th>Activity</th><th>Course</th><th>Date</th><th>Status</th></tr></thead>
      <tbody>
        {rows.map(row => <tr key={row.id}>
          <td className="font-medium">{row.learner}</td>
          <td>{row.action}</td>
          <td>{row.course}</td>
          <td className="whitespace-nowrap">{row.date}</td>
          <td>{row.status !== 'Info' && <span className={`badge ${statusClass(row.status)}`}>{row.status}</span>}</td>
        </tr>)}
        {rows.length === 0 && <tr><td colSpan={5}><div className="empty-state"><History size={28} /><p>No learner activity yet.</p></div></td></tr>}
      </tbody>
    </table></div>
  </section>;
}
