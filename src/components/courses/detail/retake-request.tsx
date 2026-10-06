'use client';

import { useState } from 'react';
import { Clock3, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAction } from '@/hooks/use-action';
import { requestRetakeAction } from '@/lib/actions/learner';
import type { LearnerCourse } from '@/lib/types';

/** Retake request control for a completed course: request, pending, or declined (can ask again). */
export function RetakeRequest({ course }: { course: LearnerCourse }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const action = useAction(requestRetakeAction);
  if (course.status !== 'Completed') return null;

  if (course.retake === 'pending') {
    return <span className="badge progress"><Clock3 size={12} />Retake requested — awaiting approval</span>;
  }

  const busy = action.state === 'loading';
  return <>
    <div className="flex flex-col gap-1">
      <Button variant="outline" size="sm" onClick={() => { setReason(''); action.reset(); setOpen(true); }}><RotateCcw size={14} />Request retake</Button>
      {course.retake === 'declined' && <span className="text-[10px] text-muted-foreground">Last request declined{course.retakeNote ? `: ${course.retakeNote}` : ''}</span>}
    </div>
    <Dialog open={open} onOpenChange={o => !busy && setOpen(o)}>
      <DialogContent className="modal-content">
        <form onSubmit={async e => { e.preventDefault(); const r = await action.run({ courseId: course.id, reason }); if (r.ok) setOpen(false); }} noValidate>
          <DialogHeader>
            <DialogTitle>Request a retake</DialogTitle>
            <DialogDescription>Your training administrator will review the request. Until it is approved you can still review the course; your current completion and certificate stay on record.</DialogDescription>
          </DialogHeader>
          <div className="form-stack">
            <div className="form-field">
              <label htmlFor="retake-reason">Reason <span className="text-muted-foreground font-normal">(optional)</span></label>
              <textarea id="retake-reason" className="form-textarea" maxLength={500} value={reason} onChange={e => setReason(e.target.value)} disabled={busy} />
            </div>
          </div>
          {action.error && <p className="form-error mt-3" role="alert">{action.error}</p>}
          <DialogFooter className="mt-6 gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? <><Loader2 className="animate-spin" />Sending…</> : 'Send request'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}
