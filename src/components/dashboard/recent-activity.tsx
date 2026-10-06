import Link from 'next/link';
import { ArrowRight, Award, CheckCircle2, Play, XCircle, type LucideIcon } from 'lucide-react';
import type { LearnerActivityItem } from '@/lib/types';

const display: Record<LearnerActivityItem['kind'], { icon: LucideIcon; iconSize: number; tone?: 'blue'; verb: string }> = {
  started: { icon: Play, iconSize: 12, tone: 'blue', verb: 'Started' },
  completed: { icon: CheckCircle2, iconSize: 14, verb: 'Completed' },
  passed: { icon: Award, iconSize: 14, verb: 'Passed the assessment for' },
  failed: { icon: XCircle, iconSize: 14, tone: 'blue', verb: 'Did not pass the assessment for' },
};

export function RecentActivity({ activity }: { activity: LearnerActivityItem[] }) {
  return <section className="side-panel">
    <h2>Recent activity</h2>
    {activity.length === 0 && <p className="text-[11px] text-muted-foreground mt-4">No training activity yet.</p>}
    {activity.map((item, i) => {
      const { icon: Icon, iconSize, tone, verb } = display[item.kind];
      return <div className="activity-item" key={`${item.kind}-${item.course}-${i}`}>
        <span className={`activity-icon ${tone ?? ''}`}><Icon size={iconSize} /></span>
        <div>
          <p>{verb} <strong className="font-medium">{item.course}</strong></p>
          <small>{item.date}</small>
        </div>
      </div>;
    })}
    <div className="panel-divider">
      <Link href="/certificates" className="text-link text-[11px]">View my certificates <ArrowRight size={13} /></Link>
    </div>
  </section>;
}
