import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** Settings-style card with a titled header and an optional action area. */
export function AccountCard({ icon: Icon, title, subtitle, action, children }: { icon: LucideIcon; title: string; subtitle: string; action?: ReactNode; children: ReactNode }) {
  return <section className="account-card">
    <header className="account-card-head">
      <div>
        <h2 className="account-card-title"><Icon size={16} className="text-primary" /> {title}</h2>
        <p className="account-card-sub">{subtitle}</p>
      </div>
      {action}
    </header>
    {children}
  </section>;
}

/** Label + description row with a control on the right (e.g. a Switch). */
export function PreferenceRow({ title, description, last = false, children }: { title: ReactNode; description: string; last?: boolean; children?: ReactNode }) {
  return <div className={`account-pref-row ${last ? '!border-b-0 !pb-0' : ''}`}>
    <div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </div>
    {children}
  </div>;
}
