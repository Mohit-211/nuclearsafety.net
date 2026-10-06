'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { SectionHeader } from '@/components/admin/shared/detail-panels';
import { useAction } from '@/hooks/use-action';
import { activateVersionAction } from '@/lib/actions/admin';
import { formatBytes } from '@/lib/format';
import type { CourseVersionView } from '@/lib/services/catalogue';

/** Package versions of a course. Activating a version only affects NEW attempts. */
export function CourseVersionsTable({ courseId, versions }: { courseId: number; versions: CourseVersionView[] }) {
  const [confirm, setConfirm] = useState<CourseVersionView | null>(null);
  const action = useAction(activateVersionAction);

  return <section className="training-section" aria-labelledby="versions-heading">
    <SectionHeader id="versions-heading" title="SCORM package versions" meta="New attempts use the active version; learners already in progress keep theirs." />
    <div className="table-wrap">
      <table className="training-table courses-table">
        <thead><tr><th>Version</th><th>Standard</th><th className="col-category">Launch file</th><th>Uploaded</th><th className="num">Attempts</th><th>Status</th><th className="num">Actions</th></tr></thead>
        <tbody>
          {versions.map(v => <tr key={v.id}>
            <td data-label="Version"><div className="table-course"><span className="table-course-icon"><Package size={15} /></span><div><strong>v{v.versionNumber}</strong><small>{v.originalFilename ?? '—'} · {formatBytes(v.zipSizeBytes)} · {v.fileCount} files</small></div></div></td>
            <td data-label="Standard">SCORM {v.scormVersion}{v.schemaVersion && v.schemaVersion !== v.scormVersion ? <small className="block text-muted-foreground">{v.schemaVersion}</small> : null}</td>
            <td className="col-category" data-label="Launch file"><code className="text-[11px] break-all">{v.launchPath}</code>{v.scoCount > 1 && <small className="block text-warning">{v.scoCount} SCOs (first is launched)</small>}</td>
            <td data-label="Uploaded">{v.uploadedAt}<small className="block text-muted-foreground">{v.uploadedBy ?? ''}</small></td>
            <td className="num" data-label="Attempts">{v.attempts}</td>
            <td data-label="Status">{v.isActive ? <span className="badge completed"><CheckCircle2 size={12} />Active</span> : <span className="badge">Inactive</span>}</td>
            <td data-label="Actions"><div className="courses-actions">
              {!v.isActive && <Button variant="outline" size="sm" disabled={action.state === 'loading'} onClick={() => setConfirm(v)}>
                {action.state === 'loading' && confirm?.id === v.id ? <Loader2 size={13} className="animate-spin" /> : null}Activate
              </Button>}
            </div></td>
          </tr>)}
          {versions.length === 0 && <tr><td colSpan={7}><div className="empty-state"><Package size={28} /><p>No package uploaded.</p></div></td></tr>}
        </tbody>
      </table>
    </div>
    {versions.some(v => v.warnings.length) && <ul className="warning-list">
      {versions.flatMap(v => v.warnings.map(w => <li key={`${v.id}-${w}`}>v{v.versionNumber}: {w}</li>))}
    </ul>}
    {action.error && <p className="form-error mt-3" role="alert">{action.error}</p>}
    <ConfirmDialog open={!!confirm} onOpenChange={o => !o && setConfirm(null)}
      title={`Activate version ${confirm?.versionNumber}?`}
      description="Learners who start this course from now on will get this version. Learners already in progress continue on the version they started, so their saved progress is not affected."
      confirmLabel="Activate version" onConfirm={() => { if (confirm) void action.run({ courseId, versionId: confirm.id }); }} />
  </section>;
}
