import Link from 'next/link';
import { ArrowRight, CalendarDays, Clock3 } from 'lucide-react';
import type { LearnerCourse } from '@/lib/types';

function remaining(days: number) {
  if (days < 0) return `${-days} day${days === -1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  return `${days} day${days === 1 ? '' : 's'} remaining`;
}

export function UpcomingDeadlines({ courses }: { courses: LearnerCourse[] }) {
  const upcoming = courses
    .filter(c => c.status !== 'Completed' && c.daysUntilDue !== null)
    .sort((a, b) => a.daysUntilDue! - b.daysUntilDue!)
    .slice(0, 3);
  return <section className="side-panel">
    <div className="flex items-center justify-between">
      <h2>Upcoming deadlines</h2>
      <CalendarDays size={16} className="text-muted-foreground" />
    </div>
    {upcoming.length === 0 && <p className="text-[11px] text-muted-foreground mt-4">No upcoming deadlines.</p>}
    {upcoming.map(c => <div className="deadline" key={c.id}>
      <span className="deadline-icon"><Clock3 size={16} /></span>
      <div>
        <strong>{c.title}</strong>
        <p>Due {c.due}</p>
        {c.daysUntilDue! <= 10
          ? <span className="badge due mt-2">{remaining(c.daysUntilDue!)}</span>
          : <span className="text-[10px] text-muted-foreground block mt-2">{remaining(c.daysUntilDue!)}</span>}
      </div>
    </div>)}
    <div className="panel-divider">
      <Link href="/my-training" className="text-link text-[11px]">View training schedule <ArrowRight size={13} /></Link>
    </div>
  </section>;
}
