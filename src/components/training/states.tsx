import { useEffect, useState, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/** Simulates a short first load so skeleton states are visible in the preview. */
export function useSimulatedLoad(ms = 650) {
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), ms); return () => clearTimeout(t); }, [ms]);
  return loading;
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return <div className="empty-state" role="status">
    {icon && <span className="empty-state-icon">{icon}</span>}
    <p className="empty-state-title">{title}</p>
    {description && <p className="empty-state-desc">{description}</p>}
    {action && <div className="empty-state-action">{action}</div>}
  </div>;
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return <div className="table-wrap skeleton-table" aria-busy="true" aria-label="Loading">
    {Array.from({ length: rows }, (_, r) => <div className="skeleton-row" key={r}>
      {Array.from({ length: cols }, (_, c) => <Skeleton key={c} className={c === 0 ? 'h-4 w-[30%]' : 'h-3 flex-1'} />)}
    </div>)}
  </div>;
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return <div className="course-grid" aria-busy="true" aria-label="Loading">
    {Array.from({ length: count }, (_, i) => <div className="course-card" key={i}>
      <Skeleton className="h-4 w-24" /><Skeleton className="h-5 w-3/4 mt-3" /><Skeleton className="h-3 w-full mt-3" />
      <Skeleton className="h-3 w-2/3 mt-2" /><Skeleton className="h-2 w-full mt-5" /><Skeleton className="h-8 w-28 mt-5 self-end" />
    </div>)}
  </div>;
}

/** Local-only async action: idle → loading → success (or error) → idle. */
export function useFakeAction(ms = 900) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const run = (fail = false) => {
    setState('loading');
    setTimeout(() => { setState(fail ? 'error' : 'success'); }, ms);
  };
  return { state, run, reset: () => setState('idle') };
}
