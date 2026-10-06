import type { LucideIcon } from 'lucide-react';
import { ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';

/** Small footnote shown under preview-only sections. */
export function SampleNote({ children, icon: Icon = ShieldCheck }: { children: ReactNode; icon?: LucideIcon }) {
  return <div className="flex items-center gap-3 mt-5 text-[11px] text-muted-foreground">
    <Icon size={16} className="text-primary" />
    <span>{children}</span>
  </div>;
}
