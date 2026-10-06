'use client';

import { useState } from 'react';
import { Loader2, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { SuccessView } from '@/components/shared/success-view';
import { useAction } from '@/hooks/use-action';
import type { ActionResult } from '@/lib/actions/result';

export type EnrollItem = { id: number; label: string; meta?: string };
export type EnrollmentDiff = { add: number[]; remove: number[]; dueDate: string | null };

/**
 * Add/remove enrollments for one course (noun "learner") or one learner (noun "course").
 * Changes are staged locally and saved in one server call.
 */
export function EnrollmentDialog({ open, onOpenChange, subject, enrolled, available, noun, defaultDueDate, save }: {
  open: boolean; onOpenChange: (o: boolean) => void; subject: string; enrolled: EnrollItem[]; available: EnrollItem[];
  noun: 'learner' | 'course'; defaultDueDate: string | null; save: (diff: EnrollmentDiff) => Promise<ActionResult>;
}) {
  const [items, setItems] = useState(enrolled);
  const [pick, setPick] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate ?? '');
  const [removing, setRemoving] = useState<EnrollItem | null>(null);
  const action = useAction(save);

  // Reset the list each time the dialog opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) { setItems(enrolled); setPick(''); setDueDate(defaultDueDate ?? ''); action.reset(); }
  }

  const options = available.filter(a => !items.some(i => i.id === a.id));
  const busy = action.state === 'loading';
  const add = () => { const found = available.find(a => String(a.id) === pick); if (found) { setItems(s => [...s, found]); setPick(''); } };
  const added = items.filter(i => !enrolled.some(e => e.id === i.id)).map(i => i.id);
  const removed = enrolled.filter(e => !items.some(i => i.id === e.id)).map(e => e.id);
  const submit = () => action.run({ add: added, remove: removed, dueDate: dueDate || null });

  return <>
    <Dialog open={open} onOpenChange={o => !busy && onOpenChange(o)}>
      <DialogContent className="modal-content">
        {action.state === 'success'
          ? <SuccessView title="Enrollment updated" text={`${added.length} added · ${removed.length} removed.`} onClose={() => onOpenChange(false)} />
          : <>
            <DialogHeader><DialogTitle>Manage enrollment</DialogTitle><DialogDescription>{subject}</DialogDescription></DialogHeader>
            <div className="enroll-add">
              <select className="course-select form-select" value={pick} onChange={e => setPick(e.target.value)} aria-label={`Select a ${noun}`} disabled={busy || !options.length}>
                <option value="">{options.length ? `Select a ${noun}…` : `No ${noun}s available`}</option>
                {options.map(o => <option key={o.id} value={o.id}>{o.label}{o.meta ? ` — ${o.meta}` : ''}</option>)}
              </select>
              <Button variant="outline" onClick={add} disabled={!pick || busy}><UserPlus size={14} />Add</Button>
            </div>
            <div className="enroll-list">
              {items.length === 0 && <p className="enroll-empty">No {noun}s enrolled.</p>}
              {items.map(i => <div className="enroll-item" key={i.id}>
                <div><strong>{i.label}</strong>{i.meta && <small>{i.meta}</small>}</div>
                <Button variant="ghost" size="icon" aria-label={`Remove ${i.label}`} disabled={busy} onClick={() => enrolled.some(e => e.id === i.id) ? setRemoving(i) : setItems(s => s.filter(x => x.id !== i.id))}><Trash2 size={14} /></Button>
              </div>)}
            </div>
            {added.length > 0 && <div className="form-field mt-4">
              <label htmlFor="enroll-due">Due date for new enrollments <span className="text-muted-foreground font-normal">(optional)</span></label>
              <input id="enroll-due" type="date" className="form-input" value={dueDate} onChange={e => setDueDate(e.target.value)} disabled={busy} />
            </div>}
            {action.error && <p className="form-error mt-3" role="alert">{action.error}</p>}
            <DialogFooter className="mt-5 gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
              <Button onClick={submit} disabled={busy || (!added.length && !removed.length)}>{busy ? <><Loader2 className="animate-spin" />Saving…</> : 'Save enrollment'}</Button>
            </DialogFooter>
          </>}
      </DialogContent>
    </Dialog>
    <ConfirmDialog open={!!removing} onOpenChange={o => !o && setRemoving(null)} destructive
      title={`Remove ${removing?.label ?? ''}?`} description={`The ${noun === 'learner' ? 'learner will lose access to this course' : 'course will be removed from this learner'}. Their progress and history are kept and restored if re-assigned.`}
      confirmLabel="Remove" onConfirm={() => { setItems(s => s.filter(x => x.id !== removing?.id)); setRemoving(null); }} />
  </>;
}
