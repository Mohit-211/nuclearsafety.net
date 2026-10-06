'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SuccessView } from '@/components/shared/success-view';
import { useAction } from '@/hooks/use-action';
import { setCourseStatusAction, updateCourseAction } from '@/lib/actions/admin';

const categories = ['Core training', 'Radiation protection', 'Safety culture', 'Emergency response', 'Operations', 'Workplace safety'];

export type CourseStatus = 'draft' | 'published' | 'archived';

export type CourseFormValues = {
  code: string; title: string; description: string; category: string; estimatedDuration: string; isMandatory: boolean; status: CourseStatus;
};

/** Edit human-facing course metadata and status. SCORM internals are never edited here. */
export function CourseFormDialog({ open, onOpenChange, courseId, initial, hasActiveVersion }: {
  open: boolean; onOpenChange: (o: boolean) => void; courseId: number; initial: CourseFormValues; hasActiveVersion: boolean;
}) {
  const [values, setValues] = useState<CourseFormValues>(initial);
  const save = useAction(async (v: CourseFormValues) => {
    const { status, ...meta } = v;
    const res = await updateCourseAction({ courseId, ...meta });
    if (!res.ok || status === initial.status) return res;
    return setCourseStatusAction({ courseId, status });
  });

  // Reset the form each time the dialog opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) { setValues(initial); save.reset(); }
  }

  const set = <K extends keyof CourseFormValues>(k: K, v: CourseFormValues[K]) => setValues(s => ({ ...s, [k]: v }));
  const busy = save.state === 'loading';
  const fe = save.fieldErrors;

  return <Dialog open={open} onOpenChange={o => !busy && onOpenChange(o)}>
    <DialogContent className="modal-content">
      {save.state === 'success'
        ? <SuccessView title="Changes saved" text="The course details have been updated." onClose={() => onOpenChange(false)} />
        : <form onSubmit={e => { e.preventDefault(); void save.run(values); }} noValidate>
          <DialogHeader><DialogTitle>Edit course</DialogTitle><DialogDescription>Learner-facing details. The SCORM package itself is not changed.</DialogDescription></DialogHeader>
          <div className="form-stack">
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="cf-title">Course title</label>
                <input id="cf-title" className={`form-input ${fe.title ? 'is-invalid' : ''}`} value={values.title} onChange={e => set('title', e.target.value)} disabled={busy} aria-invalid={!!fe.title} />
                {fe.title && <p className="form-error">{fe.title}</p>}
              </div>
              <div className="form-field">
                <label htmlFor="cf-code">Course code</label>
                <input id="cf-code" className={`form-input ${fe.code ? 'is-invalid' : ''}`} value={values.code} onChange={e => set('code', e.target.value)} disabled={busy} aria-invalid={!!fe.code} />
                {fe.code && <p className="form-error">{fe.code}</p>}
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="cf-desc">Description</label>
              <textarea id="cf-desc" className="form-textarea" value={values.description} onChange={e => set('description', e.target.value)} disabled={busy} />
            </div>
            <div className="form-row">
              <div className="form-field"><label htmlFor="cf-cat">Category</label>
                <input id="cf-cat" className="form-input" list="cf-cat-list" value={values.category} onChange={e => set('category', e.target.value)} disabled={busy} />
                <datalist id="cf-cat-list">{categories.map(c => <option key={c} value={c} />)}</datalist></div>
              <div className="form-field"><label htmlFor="cf-dur">Estimated duration</label>
                <input id="cf-dur" className="form-input" placeholder="e.g. 45 min" value={values.estimatedDuration} onChange={e => set('estimatedDuration', e.target.value)} disabled={busy} /></div>
            </div>
            <div className="form-row">
              <div className="form-field"><label htmlFor="cf-status">Status</label>
                <select id="cf-status" className="course-select form-select" value={values.status} onChange={e => set('status', e.target.value as CourseStatus)} disabled={busy}>
                  <option value="draft">Draft — hidden from learners</option>
                  <option value="published" disabled={!hasActiveVersion}>Published{hasActiveVersion ? '' : ' (needs an active package)'}</option>
                  <option value="archived">Archived — history kept, no new launches</option>
                </select></div>
              <label className="inline-check mt-6"><input type="checkbox" checked={values.isMandatory} onChange={e => set('isMandatory', e.target.checked)} disabled={busy} />Mandatory training</label>
            </div>
          </div>
          {save.error && !Object.keys(fe).length && <p className="form-error mt-3" role="alert">{save.error}</p>}
          <DialogFooter className="mt-6 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? <><Loader2 className="animate-spin" />Saving…</> : 'Save changes'}</Button>
          </DialogFooter>
        </form>}
    </DialogContent>
  </Dialog>;
}
