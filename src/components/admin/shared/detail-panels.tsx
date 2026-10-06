import type { ReactNode } from 'react';
import { ProgressTrack } from '@/components/shared/progress-track';

/** Panel with a definition list of label/value rows. */
export function InfoPanel({ id, title, rows, wideLabel }: { id: string; title: string; rows: Array<[string, ReactNode]>; wideLabel?: string }) {
  return <section className="detail-panel" aria-labelledby={id}>
    <h2 id={id}>{title}</h2>
    <dl className="mt-3">
      {rows.map(([label, value]) => (
        <div className="detail-info-row" key={label}>
          <dt>{label}</dt>
          <dd className={label === wideLabel ? 'detail-desc' : ''}>{value}</dd>
        </div>
      ))}
    </dl>
  </section>;
}

/** Panel with a headline progress bar and three summary counts underneath. */
export function ProgressSummaryPanel({ id, title, description, progressLabel, value, ariaLabel, summary }: {
  id: string;
  title: string;
  description: string;
  progressLabel: string;
  value: number;
  ariaLabel: string;
  summary: Array<{ value: number; label: string }>;
}) {
  return <section className="detail-panel" aria-labelledby={id}>
    <h2 id={id}>{title}</h2>
    <p className="detail-muted">{description}</p>
    <div className="progress-label">
      <span>{progressLabel}</span>
      <span>{value}%</span>
    </div>
    <ProgressTrack value={value} label={ariaLabel} complete={value >= 90} />
    <div className="admin-progress-summary">
      {summary.map(item => (
        <div className="admin-progress-item" key={item.label}>
          <span className="admin-progress-num">{item.value}</span>
          <span className="admin-progress-label">{item.label}</span>
        </div>
      ))}
    </div>
  </section>;
}

/** Heading row for a table section on detail pages. */
export function SectionHeader({ id, title, meta }: { id: string; title: string; meta: ReactNode }) {
  return <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
    <h2 id={id} className="text-[15px] font-semibold">{title}</h2>
    <span className="text-[11px] text-muted-foreground">{meta}</span>
  </div>;
}

/** Fallback shown when an admin detail page's record does not exist. */
export function AdminRecordNotFound({ icon, message, action }: { icon: ReactNode; message: string; action: ReactNode }) {
  return <div className="empty-state">
    {icon}
    <p>{message}</p>
    {action}
  </div>;
}
