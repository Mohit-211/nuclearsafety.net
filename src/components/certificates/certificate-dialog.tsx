'use client';

import { Printer, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { CertificateView } from '@/lib/types';

export function CertificateDialog({ certificate, onClose }: { certificate: CertificateView | null; onClose: () => void }) {
  return <Dialog open={!!certificate} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="modal-content certificate-dialog">
      <DialogTitle>Certificate of completion</DialogTitle>
      <DialogDescription>{certificate?.code} · Awarded {certificate?.awardedOn}</DialogDescription>
      <div className="certificate-print text-center border border-border py-10 px-5">
        <ShieldCheck size={38} className="text-primary mx-auto mb-5"/>
        <p className="eyebrow">nuclearsafety.net</p>
        <h2 className="mt-5">Certificate of completion</h2>
        <p className="text-muted-foreground text-sm mt-5">This certifies that</p>
        <p className="text-xl font-semibold mt-2">{certificate?.learnerName}</p>
        <p className="text-muted-foreground text-sm mt-5">has successfully completed</p>
        <p className="font-semibold text-primary mt-2">{certificate?.title}</p>
        <p className="text-xs text-muted-foreground mt-8">Completed on {certificate?.awardedOn}{certificate?.score !== null && certificate?.score !== undefined ? ` · Score ${certificate.score}%` : ''}</p>
      </div>
      <div className="flex justify-end mt-2 print-hidden">
        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer size={14} />Print</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
