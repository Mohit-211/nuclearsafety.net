'use client';

import { useState } from 'react';
import { Eye, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const resources = [
  { title: 'Nuclear safety principles', type: 'Reference guide', detail: 'An overview of fundamental nuclear safety principles.' },
  { title: 'Radiation protection glossary', type: 'Glossary', detail: 'Common terms used in radiation protection training.' },
  { title: 'Safety culture reference guide', type: 'Reference guide', detail: 'Key concepts for a strong nuclear safety culture.' },
];

type Resource = typeof resources[number];

export function ResourceList() {
  const [selected, setSelected] = useState<Resource | null>(null);
  return <>
    {resources.map(r => <article className="resource-row" key={r.title}>
      <span className="table-course-icon"><FileText size={19}/></span>
      <div className="flex-1"><h2>{r.title}</h2><p>{r.type}</p></div>
      <Button variant="outline" size="sm" onClick={() => setSelected(r)}><Eye/>Preview</Button>
    </article>)}
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
      <DialogContent className="modal-content">
        <DialogTitle>{selected?.title}</DialogTitle>
        <DialogDescription>{selected?.type}</DialogDescription>
        <p className="text-sm text-muted-foreground leading-7">{selected?.detail}</p>
        <div className="dialog-note">Sample resource listing. Final documents will be provided before launch.</div>
      </DialogContent>
    </Dialog>
  </>;
}
