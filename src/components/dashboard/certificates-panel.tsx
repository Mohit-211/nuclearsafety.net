import Link from 'next/link';
import { ArrowRight, Award, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CertificateView } from '@/lib/types';

export function CertificatesPanel({ certificates }: { certificates: CertificateView[] }) {
  return <section className="side-panel">
    <div className="flex items-center justify-between">
      <h2>My certificates</h2>
      <Award size={16} className="text-muted-foreground" />
    </div>
    {certificates.length === 0 && <p className="text-[11px] text-muted-foreground mt-4">Complete a course to earn your certificate.</p>}
    {certificates.slice(0, 3).map(c => <div className="certificate-item" key={c.id}>
      <span className="activity-icon"><Award size={14} /></span>
      <div className="min-w-0 flex-1">
        <p>{c.title}</p>
        <small>Awarded {c.awardedOn}</small>
      </div>
      <Button variant="ghost" size="sm" className="action-btn" asChild>
        <a href={c.href} download aria-label={`Download certificate for ${c.title}`} title="Download PDF"><Download size={14} /></a>
      </Button>
    </div>)}
    <div className="panel-divider">
      <Link href="/certificates" className="text-link text-[11px]">View all certificates <ArrowRight size={13} /></Link>
    </div>
  </section>;
}
