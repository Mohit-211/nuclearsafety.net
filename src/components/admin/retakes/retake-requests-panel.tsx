'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Loader2, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SectionHeader } from '@/components/admin/shared/detail-panels';
import { useAction } from '@/hooks/use-action';
import { decideRetakeAction } from '@/lib/actions/admin';
import type { RetakeRequestRow } from '@/lib/services/retakes';

/** Pending retake requests with approve / decline. Renders nothing when there are none. */
export function RetakeRequestsPanel({ rows, showLearner = true, showOrganization = false }: { rows: RetakeRequestRow[]; showLearner?: boolean; showOrganization?: boolean }) {
  const [deciding, setDeciding] = useState<{ row: RetakeRequestRow; approve: boolean } | null>(null);
  const [note, setNote] = useState('');
  const action = useAction(decideRetakeAction);
  if (!rows.length) return null;
  const busy = action.state === 'loading';

  return <section className="training-section" aria-labelledby="retakes-heading">
    <SectionHeader id="retakes-heading" title="Retake requests" meta={`${rows.length} awaiting a decision`} />
    <div className="table-wrap">
      <table className="training-table courses-table">
        <thead><tr>{showLearner && <th>Learner</th>}<th>Course</th><th className="col-category">Reason</th><th>Requested</th><th className="num">Actions</th></tr></thead>
        <tbody>
          {rows.map(r => <tr key={r.id}>
            {showLearner && <td data-label="Learner"><Link href={`/admin/learners/${r.userId}`} className="font-medium hover:underline">{r.learner}</Link>
              <small className="block text-[10px] text-muted-foreground">{showOrganization ? r.organization ?? 'Individual' : r.email}</small></td>}
            <td data-label="Course">{r.course}<small className="block text-[10px] text-muted-foreground">{r.courseCode}</small></td>
            <td className="col-category" data-label="Reason">{r.reason ?? '—'}</td>
            <td data-label="Requested">{r.requestedOn}</td>
            <td data-label="Actions"><div className="courses-actions">
              <Button size="sm" variant="outline" onClick={() => { setNote(''); action.reset(); setDeciding({ row: r, approve: true }); }}><Check size={14} />Approve</Button>
              <Button size="sm" variant="ghost" onClick={() => { setNote(''); action.reset(); setDeciding({ row: r, approve: false }); }}><X size={14} />Decline</Button>
            </div></td>
          </tr>)}
        </tbody>
      </table>
    </div>

    <Dialog open={!!deciding} onOpenChange={o => !busy && !o && setDeciding(null)}>
      <DialogContent className="modal-content">
        <form onSubmit={async e => {
          e.preventDefault();
          if (!deciding) return;
          const res = await action.run({ requestId: deciding.row.id, approve: deciding.approve, note });
          if (res.ok) setDeciding(null);
        }} noValidate>
          <DialogHeader>
            <DialogTitle>{deciding?.approve ? 'Approve retake' : 'Decline retake'}</DialogTitle>
            <DialogDescription>{deciding?.approve
              ? `${deciding.row.learner} will be able to take “${deciding.row.course}” again from the start. Their earlier completion and certificate stay on record.`
              : `${deciding?.row.learner} will keep review-only access to “${deciding?.row.course}”.`} The learner is notified by email.</DialogDescription>
          </DialogHeader>
          <div className="form-stack">
            <div className="form-field"><label htmlFor="retake-note">Note to learner <span className="text-muted-foreground font-normal">(optional)</span></label>
              <textarea id="retake-note" className="form-textarea" maxLength={500} value={note} onChange={e => setNote(e.target.value)} disabled={busy} /></div>
          </div>
          {action.error && <p className="form-error mt-3" role="alert">{action.error}</p>}
          <DialogFooter className="mt-6 gap-2">
            <Button type="button" variant="outline" onClick={() => setDeciding(null)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy} className={deciding?.approve ? '' : 'btn-destructive'}>
              {busy ? <Loader2 className="animate-spin" /> : deciding?.approve ? <RotateCcw size={14} /> : <X size={14} />}
              {deciding?.approve ? 'Approve retake' : 'Decline request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </section>;
}
