'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Award, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SectionHeader } from '@/components/admin/shared/detail-panels';
import { SuccessView } from '@/components/shared/success-view';
import { useAction } from '@/hooks/use-action';
import { generateCertificatesAction } from '@/lib/actions/admin';
import type { PendingCertificateRow } from '@/lib/services/certificates';

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;

/**
 * Completed courses without a certificate (learners who finished before certificates were
 * introduced), to generate one by one or all at once. Renders nothing when there are none.
 */
export function PendingCertificatesPanel({ rows, showLearner = true, showOrganization = false }: {
  rows: PendingCertificateRow[]; showLearner?: boolean; showOrganization?: boolean;
}) {
  const [selected, setSelected] = useState<PendingCertificateRow[] | null>(null);
  const [result, setResult] = useState<{ issued: number; emailed: number } | null>(null);
  const action = useAction(generateCertificatesAction);
  // The dialog stays mounted to show the result while the refreshed list empties.
  if (!rows.length && !selected) return null;
  const busy = action.state === 'loading';
  const one = selected?.length === 1 ? selected[0] : null;

  const open = (items: PendingCertificateRow[]) => { setResult(null); action.reset(); setSelected(items); };
  const generate = async () => {
    if (!selected) return;
    const res = await action.run({ attemptIds: selected.map(r => r.attemptId) });
    if (res.ok) setResult(res.data);
  };

  return <>
    {rows.length > 0 && <section className="training-section" aria-labelledby="pending-certificates-heading">
      <SectionHeader id="pending-certificates-heading" title="Certificates to generate" meta={<span className="flex items-center gap-3 flex-wrap">
        {count(rows.length, 'completed course')} without a certificate
        {rows.length > 1 && <Button size="sm" onClick={() => open(rows)}><Award size={14} />Generate all</Button>}
      </span>} />
      <div className="table-wrap">
        <table className="training-table courses-table">
          <thead><tr>{showLearner && <th>Learner</th>}<th>Course</th><th>Completed on</th><th className="num">Actions</th></tr></thead>
          <tbody>
            {rows.map(r => <tr key={r.attemptId}>
              {showLearner && <td data-label="Learner"><Link href={`/admin/learners/${r.userId}`} className="font-medium hover:underline">{r.learner}</Link>
                <small className="block text-[10px] text-muted-foreground">{showOrganization ? r.organization ?? 'Individual' : r.email}</small></td>}
              <td data-label="Course">{r.course}<small className="block text-[10px] text-muted-foreground">{r.courseCode}</small></td>
              <td data-label="Completed on">{r.completedOn}</td>
              <td data-label="Actions"><div className="courses-actions">
                <Button size="sm" variant="outline" onClick={() => open([r])}><Award size={14} />Generate</Button>
              </div></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>}

    <Dialog open={!!selected} onOpenChange={o => !busy && !o && setSelected(null)}>
      <DialogContent className="modal-content">
        {result
          ? <SuccessView
            title={result.issued ? `${count(result.issued, 'certificate')} generated` : 'Nothing to generate'}
            text={!result.issued ? 'These certificates had already been issued.'
              : result.emailed === result.issued ? (result.issued === 1 ? 'The learner has been emailed their certificate.' : 'Each learner has been emailed their certificate.')
                : `${count(result.issued - result.emailed, 'email')} could not be sent. Learners can still download their certificates from their dashboard.`}
            onClose={() => setSelected(null)} />
          : <>
            <DialogHeader>
              <DialogTitle>{one ? 'Generate certificate' : `Generate ${count(selected?.length ?? 0, 'certificate')}`}</DialogTitle>
              <DialogDescription>{one
                ? `${one.learner} completed “${one.course}” on ${one.completedOn}. The certificate is dated with that day and emailed to ${one.email}.`
                : 'Each learner gets a certificate dated with the day they completed the course, sent to them by email.'}</DialogDescription>
            </DialogHeader>
            {action.error && <p className="form-error mt-3" role="alert">{action.error}</p>}
            <DialogFooter className="mt-6 gap-2">
              <Button variant="outline" onClick={() => setSelected(null)} disabled={busy}>Cancel</Button>
              <Button onClick={() => void generate()} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Award size={14} />}Generate & email</Button>
            </DialogFooter>
          </>}
      </DialogContent>
    </Dialog>
  </>;
}
