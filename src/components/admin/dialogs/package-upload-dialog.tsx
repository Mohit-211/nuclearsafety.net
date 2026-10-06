'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, FileArchive, Loader2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatBytes } from '@/lib/format';

type UploadResult = { ok: true; courseId: number; versionId: number; versionNumber: number; createdCourse: boolean; scormVersion: string; warnings: string[] }
  | { ok: false; error: string };

/**
 * "Upload ZIP and bada boom": pick a SCORM ZIP, the server validates, extracts and
 * registers it. Without `courseId` a new course is created; with it, a new version.
 */
export function PackageUploadDialog({ open, onOpenChange, courseId, courseTitle }: { open: boolean; onOpenChange: (o: boolean) => void; courseId?: number; courseTitle?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) { setFile(null); setProgress(null); setProcessing(false); setResult(null); }
  }

  const busy = progress !== null && !result;

  const upload = () => {
    if (!file) return;
    setResult(null);
    setProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', courseId ? `/api/admin/packages?courseId=${courseId}` : '/api/admin/packages');
    xhr.setRequestHeader('Content-Type', 'application/zip');
    xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
    xhr.upload.onprogress = e => {
      if (!e.lengthComputable) return;
      setProgress(Math.round((e.loaded / e.total) * 100));
      if (e.loaded === e.total) setProcessing(true);
    };
    xhr.onload = () => {
      let res: UploadResult;
      try { res = JSON.parse(xhr.responseText); } catch { res = { ok: false, error: `Upload failed (HTTP ${xhr.status}).` }; }
      setProcessing(false);
      setResult(res);
      if (res.ok) router.refresh();
    };
    xhr.onerror = () => { setProcessing(false); setResult({ ok: false, error: 'The upload was interrupted. Check your connection and try again.' }); };
    xhr.send(file);
  };

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    setResult(null);
    setFile(f);
  };

  const done = result?.ok ? result : null;

  return <Dialog open={open} onOpenChange={o => !busy && onOpenChange(o)}>
    <DialogContent className="modal-content">
      <DialogHeader>
        <DialogTitle>{courseId ? 'Upload new version' : 'Add course from SCORM package'}</DialogTitle>
        <DialogDescription>{courseId
          ? `A new package version for ${courseTitle}. Learners already in progress stay on their current version; you choose when to activate it for new attempts.`
          : 'Upload a SCORM 1.2 or SCORM 2004 ZIP. The package is validated, extracted and registered as a new draft course automatically.'}</DialogDescription>
      </DialogHeader>

      {done ? <div className="dialog-success" role="status">
        <span className="dialog-success-icon"><CheckCircle2 size={26} /></span>
        <p className="font-semibold">{done.createdCourse ? 'Course created' : `Version ${done.versionNumber} uploaded`}</p>
        <p className="text-sm text-muted-foreground">Detected SCORM {done.scormVersion}. {done.createdCourse ? 'Review the details, then publish and assign it.' : 'Activate it from the versions list when ready.'}</p>
        {done.warnings.length > 0 && <ul className="warning-list text-left w-full">{done.warnings.map(w => <li key={w}>{w}</li>)}</ul>}
        <div className="flex gap-2 mt-4">
          {done.createdCourse
            ? <Button onClick={() => { onOpenChange(false); router.push(`/admin/courses/${done.courseId}`); }}>Open course</Button>
            : <Button onClick={() => onOpenChange(false)}>Done</Button>}
        </div>
      </div> : <>
        <label className={`upload-drop mt-4 ${dragging ? 'is-dragging' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); if (!busy) pickFile(e.dataTransfer.files[0]); }}>
          <input ref={input} type="file" accept=".zip,application/zip" disabled={busy} onChange={e => pickFile(e.target.files?.[0])} />
          {file ? <FileArchive size={28} className="text-primary" /> : <UploadCloud size={28} className="text-primary" />}
          <strong className="text-sm">{file ? file.name : 'Choose a SCORM ZIP file'}</strong>
          <span className="text-xs text-muted-foreground">{file ? formatBytes(file.size) : 'Click to browse or drop the file here'}</span>
        </label>
        {progress !== null && <>
          <div className="upload-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${progress}%` }} /></div>
          <p className="text-xs text-muted-foreground mt-2">{processing ? 'Validating and extracting the package…' : `Uploading… ${progress}%`}</p>
        </>}
        {result && !result.ok && <p className="form-error mt-3" role="alert">{result.error}</p>}
        <DialogFooter className="mt-5 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={upload} disabled={!file || busy}>{busy ? <><Loader2 className="animate-spin" />{processing ? 'Processing…' : 'Uploading…'}</> : 'Upload package'}</Button>
        </DialogFooter>
      </>}
    </DialogContent>
  </Dialog>;
}
