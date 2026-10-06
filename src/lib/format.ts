/*
 * Display formatting (client-safe). Dates are shown in the platform time zone so
 * server and client render identically.
 */

export const TIME_ZONE = 'Europe/London';

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TIME_ZONE });
const longDateFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TIME_ZONE });
const isoDayFmt = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TIME_ZONE });

/** "6 Oct 2026" */
export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? parseDay(d) : d;
  return Number.isNaN(date.getTime()) ? '—' : dateFmt.format(date);
}

/** "Tuesday, 6 October 2026" */
export function formatLongDate(d: Date): string {
  return longDateFmt.format(d);
}

/** Today's date in the platform zone as YYYY-MM-DD. */
export function todayISO(now = new Date()): string {
  return isoDayFmt.format(now);
}

/** Parse a YYYY-MM-DD calendar day as midday UTC (stable across time zones). */
export function parseDay(day: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? new Date(`${day}T12:00:00Z`) : new Date(day);
}

/** Whole days from today until a YYYY-MM-DD day (negative when past). */
export function daysUntil(day: string, now = new Date()): number {
  return Math.round((parseDay(day).getTime() - parseDay(todayISO(now)).getTime()) / 86_400_000);
}

/** "Today", "Yesterday" or a date. */
export function formatRelativeDay(d: Date | null | undefined, now = new Date()): string {
  if (!d) return '—';
  const diff = daysUntil(todayISO(d), now);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  return formatDate(d);
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase() || '?';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

export function statusClass(status: string): string {
  switch (status) {
    case 'Completed': case 'Published': case 'Active': case 'Passed': case 'Ready': return 'completed';
    case 'In progress': case 'Invited': return 'progress';
    case 'Overdue': case 'Failed': case 'Archived': return 'due';
    default: return '';
  }
}
