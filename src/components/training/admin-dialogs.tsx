import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Trash2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useFakeAction } from './states';

const categories = ['Core safety', 'Radiation protection', 'Safety culture', 'Emergency preparedness', 'Operations', 'Workplace safety'];

function SuccessView({ title, text, onClose }: { title: string; text: string; onClose: () => void }) {
  return <div className="dialog-success" role="status">
    <span className="dialog-success-icon"><CheckCircle2 size={26} /></span>
    <DialogTitle>{title}</DialogTitle>
    <DialogDescription>{text}</DialogDescription>
    <Button className="mt-5" onClick={onClose}>Done</Button>
  </div>;
}

export type CourseFormValues = { title: string; category: string; duration: string; status: 'Published' | 'Draft' };

export function CourseFormDialog({ open, onOpenChange, mode, initial }: { open: boolean; onOpenChange: (o: boolean) => void; mode: 'add' | 'edit'; initial?: Partial<CourseFormValues> }) {
  const blank: CourseFormValues = { title: '', category: categories[0]!, duration: '', status: 'Draft' };
  const [values, setValues] = useState<CourseFormValues>({ ...blank, ...initial });
  const [error, setError] = useState('');
  const action = useFakeAction();
  useEffect(() => { if (open) { setValues({ ...blank, ...initial }); setError(''); action.reset(); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: keyof CourseFormValues, v: string) => setValues(s => ({ ...s, [k]: v }));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.title.trim()) { setError('Enter a course title.'); return; }
    setError(''); action.run();
  };
  const busy = action.state === 'loading';
  return <Dialog open={open} onOpenChange={o => !busy && onOpenChange(o)}>
    <DialogContent className="modal-content">
      {action.state === 'success'
        ? <SuccessView title={mode === 'add' ? 'Course created' : 'Changes saved'} text="Preview only — nothing is stored." onClose={() => onOpenChange(false)} />
        : <form onSubmit={submit} noValidate>
          <DialogHeader><DialogTitle>{mode === 'add' ? 'Add course' : 'Edit course'}</DialogTitle><DialogDescription>{mode === 'add' ? 'Create a draft course in the catalogue.' : 'Update the course details.'}</DialogDescription></DialogHeader>
          <div className="form-stack">
            <div className="form-field">
              <label htmlFor="cf-title">Course title</label>
              <input id="cf-title" className={`form-input ${error ? 'is-invalid' : ''}`} value={values.title} onChange={e => set('title', e.target.value)} disabled={busy} aria-invalid={!!error} aria-describedby={error ? 'cf-title-err' : undefined} />
              {error && <p id="cf-title-err" className="form-error">{error}</p>}
            </div>
            <div className="form-row">
              <div className="form-field"><label htmlFor="cf-cat">Category</label>
                <select id="cf-cat" className="course-select form-select" value={values.category} onChange={e => set('category', e.target.value)} disabled={busy}>{Array.from(new Set([values.category, ...categories])).map(c => <option key={c}>{c}</option>)}</select></div>
              <div className="form-field"><label htmlFor="cf-dur">Duration</label>
                <input id="cf-dur" className="form-input" placeholder="e.g. 2h 30m" value={values.duration} onChange={e => set('duration', e.target.value)} disabled={busy} /></div>
            </div>
            <div className="form-field"><label htmlFor="cf-status">Status</label>
              <select id="cf-status" className="course-select form-select" value={values.status} onChange={e => set('status', e.target.value)} disabled={busy}><option>Draft</option><option>Published</option></select></div>
          </div>
          <DialogFooter className="mt-6 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? <><Loader2 className="animate-spin" />Saving…</> : mode === 'add' ? 'Create course' : 'Save changes'}</Button>
          </DialogFooter>
        </form>}
    </DialogContent>
  </Dialog>;
}

export type EnrollItem = { id: string; label: string; meta?: string };

export function EnrollmentDialog({ open, onOpenChange, subject, enrolled, available, noun }: { open: boolean; onOpenChange: (o: boolean) => void; subject: string; enrolled: EnrollItem[]; available: EnrollItem[]; noun: 'learner' | 'course' }) {
  const [items, setItems] = useState(enrolled);
  const [pick, setPick] = useState('');
  const [removing, setRemoving] = useState<EnrollItem | null>(null);
  const action = useFakeAction();
  useEffect(() => { if (open) { setItems(enrolled); setPick(''); action.reset(); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const options = available.filter(a => !items.some(i => i.id === a.id));
  const busy = action.state === 'loading';
  const add = () => { const found = available.find(a => a.id === pick); if (found) { setItems(s => [...s, found]); setPick(''); } };
  return <>
    <Dialog open={open} onOpenChange={o => !busy && onOpenChange(o)}>
      <DialogContent className="modal-content">
        {action.state === 'success'
          ? <SuccessView title="Enrollment updated" text="Preview only — nothing is stored." onClose={() => onOpenChange(false)} />
          : <>
            <DialogHeader><DialogTitle>Manage enrollment</DialogTitle><DialogDescription>{subject}</DialogDescription></DialogHeader>
            <div className="enroll-add">
              <select className="course-select form-select" value={pick} onChange={e => setPick(e.target.value)} aria-label={`Select a ${noun}`} disabled={busy || !options.length}>
                <option value="">{options.length ? `Select a ${noun}…` : `No ${noun}s available`}</option>
                {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              <Button variant="outline" onClick={add} disabled={!pick || busy}><UserPlus size={14} />Add</Button>
            </div>
            <div className="enroll-list">
              {items.length === 0 && <p className="enroll-empty">No {noun}s enrolled.</p>}
              {items.map(i => <div className="enroll-item" key={i.id}>
                <div><strong>{i.label}</strong>{i.meta && <small>{i.meta}</small>}</div>
                <Button variant="ghost" size="icon" aria-label={`Remove ${i.label}`} disabled={busy} onClick={() => setRemoving(i)}><Trash2 size={14} /></Button>
              </div>)}
            </div>
            <DialogFooter className="mt-5 gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
              <Button onClick={() => action.run()} disabled={busy}>{busy ? <><Loader2 className="animate-spin" />Saving…</> : 'Save enrollment'}</Button>
            </DialogFooter>
          </>}
      </DialogContent>
    </Dialog>
    <ConfirmDialog open={!!removing} onOpenChange={o => !o && setRemoving(null)} destructive
      title={`Remove ${removing?.label ?? ''}?`} description={`Their progress for this ${noun === 'learner' ? 'course' : 'learner'} will no longer be tracked.`}
      confirmLabel="Remove" onConfirm={() => { setItems(s => s.filter(x => x.id !== removing?.id)); setRemoving(null); }} />
  </>;
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive = false, onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description: string; confirmLabel?: string; cancelLabel?: string; destructive?: boolean; onConfirm: () => void }) {
  return <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent className="modal-content confirm-dialog">
      <AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
        <AlertDialogAction className={destructive ? 'btn-destructive' : ''} onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
