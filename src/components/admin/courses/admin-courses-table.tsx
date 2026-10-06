import Link from 'next/link';
import { BookOpen, Eye, Pencil, Search, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableProgress } from '@/components/shared/progress-track';
import { EmptyState } from '@/components/shared/states';
import { statusClass } from '@/lib/format';
import type { AdminCourseRow } from '@/lib/types';

export function AdminCoursesTable({ rows, canEdit, onManage, onClearFilters }: { rows: AdminCourseRow[]; canEdit: boolean; onManage: (row: AdminCourseRow) => void; onClearFilters: () => void }) {
  return <div className="table-wrap">
    <table className="training-table courses-table">
      <thead>
        <tr>
          <th>Course</th>
          <th className="col-category">Category</th>
          <th className="num">Enrolled learners</th>
          <th>Completion rate</th>
          <th>Status</th>
          <th className="num">Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => <tr key={row.id}>
          <td>
            <div className="table-course">
              <span className="table-course-icon"><BookOpen size={16} /></span>
              <div><strong>{row.title}</strong><small>{row.code}{row.scormVersion ? ` · ${row.scormVersion} · v${row.versionNumber}` : ' · No package'}</small></div>
            </div>
          </td>
          <td className="col-category" data-label="Category">{row.category}</td>
          <td className="num font-medium" data-label="Enrolled learners">{row.enrolled}</td>
          <td data-label="Completion rate">
            <TableProgress value={row.completionRate} label={`${row.title} completion rate`} complete={row.completionRate >= 90} />
          </td>
          <td data-label="Status"><span className={`badge ${statusClass(row.status)}`}>{row.status}</span></td>
          <td data-label="Actions">
            <div className="courses-actions">
              <Button variant="ghost" size="sm" className="action-btn" asChild>
                <Link href={`/admin/courses/${row.id}`} aria-label={`View ${row.title}`}><Eye size={14} /><span>View</span></Link>
              </Button>
              {canEdit && <Button variant="ghost" size="sm" className="action-btn" asChild>
                <Link href={`/admin/courses/${row.id}?edit=1`} aria-label={`Edit ${row.title}`}><Pencil size={14} /><span>Edit</span></Link>
              </Button>}
              <Button variant="ghost" size="sm" className="action-btn" aria-label={`Manage enrollment for ${row.title}`} disabled={row.status !== 'Published'} onClick={() => onManage(row)}><Settings2 size={14} /><span>Manage</span></Button>
            </div>
          </td>
        </tr>)}
        {rows.length === 0 && (
          <tr><td colSpan={6}><EmptyState icon={<Search size={22} />} title="No courses found" description="Try a different search term or filter." action={<Button variant="outline" size="sm" onClick={onClearFilters}>Clear filters</Button>} /></td></tr>
        )}
      </tbody>
    </table>
  </div>;
}
