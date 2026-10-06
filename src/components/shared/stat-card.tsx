import type { LucideIcon } from 'lucide-react';

export type StatCardProps = {
  label: string;
  value: string | number;
  note: string;
  icon: LucideIcon;
  tone?: '' | 'success' | 'warning';
  iconSize?: number;
};

export function StatCard({ label, value, note, icon: Icon, tone = '', iconSize = 17 }: StatCardProps) {
  return <div className="stat">
    <div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}><Icon size={iconSize} /></span></div>
    <div className="stat-value">{value}</div>
    <div className="stat-note">{note}</div>
  </div>;
}

export function StatsGrid({ stats }: { stats: StatCardProps[] }) {
  return <div className="stats-grid">
    {stats.map(stat => <StatCard key={stat.label} {...stat} />)}
  </div>;
}
