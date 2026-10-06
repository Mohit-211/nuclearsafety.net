'use client';

import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';

/** Confirmation body shown inside a dialog once a preview action succeeds. */
export function SuccessView({ title, text, onClose }: { title: string; text: string; onClose: () => void }) {
  return <div className="dialog-success" role="status">
    <span className="dialog-success-icon"><CheckCircle2 size={26} /></span>
    <DialogTitle>{title}</DialogTitle>
    <DialogDescription>{text}</DialogDescription>
    <Button className="mt-5" onClick={onClose}>Done</Button>
  </div>;
}
