/**
 * Horizontal progress bar. `complete` switches the fill to the success colour (defaults to 100%).
 * A null value means the course does not report progress: the bar stays empty and shows "—".
 */
export function ProgressTrack({ value, label, complete = value !== null && value >= 100 }: { value: number | null; label: string; complete?: boolean }) {
  return <div className="progress-track" role="progressbar" aria-label={label} aria-valuenow={value ?? undefined} aria-valuemin={0} aria-valuemax={100}
    aria-valuetext={value === null ? 'In progress' : undefined}>
    <div className={`progress-fill ${complete ? 'p100' : ''}`} style={value ? { width: `${value}%` } : undefined} />
  </div>;
}

/** Compact progress bar with a percentage label, used in table cells. */
export function TableProgress(props: { value: number | null; label: string; complete?: boolean }) {
  return <div className="table-progress">
    <ProgressTrack {...props} />
    <span>{props.value === null ? '—' : `${props.value}%`}</span>
  </div>;
}

export const pct = (value: number | null) => (value === null ? '—' : `${value}%`);
