import Link from 'next/link';
import { ArrowUpRight, CircleHelp } from 'lucide-react';

export function HelpPanel() {
  return <div className="help-panel">
    <CircleHelp size={21} className="text-primary" />
    <h3>Need a little guidance?</h3>
    <p>Find useful documents and reference materials in your resource library.</p>
    <Link href="/resources" className="text-link text-[11px]">Explore resources <ArrowUpRight size={13} /></Link>
  </div>;
}
