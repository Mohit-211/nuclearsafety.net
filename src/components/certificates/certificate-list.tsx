'use client';

import { useState } from 'react';
import { Award, Eye, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/states';
import type { CertificateView } from '@/lib/types';
import { CertificateDialog } from './certificate-dialog';

export function CertificateList({ certificates }: { certificates: CertificateView[] }) {
  const [selected, setSelected] = useState<CertificateView | null>(null);
  if (!certificates.length) {
    return <EmptyState icon={<Award size={22} />} title="No certificates yet" description="Certificates appear here when you complete a course." />;
  }
  return <>
    <div className="course-grid">
      {certificates.map(c => <article className="catalog-card" key={c.courseId}>
        <div className="catalog-icon"><Award size={38} strokeWidth={1.3}/></div>
        <div className="catalog-card-body">
          <span className="badge completed"><ShieldCheck size={12}/>Completed</span>
          <h2>{c.title}</h2>
          <p className="text-xs text-muted-foreground">Awarded {c.awardedOn}</p>
          <p className="text-xs text-muted-foreground mt-2">{c.learnerName}</p>
          <Button variant="outline" size="sm" className="mt-5" onClick={() => setSelected(c)}><Eye/>View certificate</Button>
        </div>
      </article>)}
    </div>
    <CertificateDialog certificate={selected} onClose={() => setSelected(null)} />
  </>;
}
