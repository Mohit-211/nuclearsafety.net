import { Award, Download, ExternalLink, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/states';
import type { CertificateView } from '@/lib/types';

export function CertificateList({ certificates }: { certificates: CertificateView[] }) {
  if (!certificates.length) {
    return <EmptyState icon={<Award size={22} />} title="No certificates yet" description="Certificates appear here when you complete a course." />;
  }
  return <div className="course-grid">
    {certificates.map(c => <article className="catalog-card" key={c.id}>
      <div className="catalog-icon"><Award size={38} strokeWidth={1.3}/></div>
      <div className="catalog-card-body">
        <span className="badge completed"><ShieldCheck size={12}/>Completed</span>
        <h2>{c.title}</h2>
        <p className="text-xs text-muted-foreground">Awarded {c.awardedOn}</p>
        <p className="text-[10px] text-muted-foreground mt-2 break-all">Certificate no. {c.number}</p>
        <div className="flex gap-2 flex-wrap mt-5">
          <Button size="sm" asChild><a href={c.href} download><Download/>Download PDF</a></Button>
          <Button variant="outline" size="sm" asChild><a href={c.href} target="_blank" rel="noopener"><ExternalLink/>View</a></Button>
        </div>
      </div>
    </article>)}
  </div>;
}
