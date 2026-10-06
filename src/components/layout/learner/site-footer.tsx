'use client';

import Link from 'next/link';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LearnerDialog } from './app-shell-dialog';

export function SiteFooter({ isAdmin, onOpenDialog }: { isAdmin: boolean; onOpenDialog: (dialog: LearnerDialog) => void }) {
  return <footer className="site-footer">
    <div className="site-footer-inner">
      <span>© {new Date().getFullYear()} nuclearsafety.net</span>
      <div className="flex items-center gap-5 flex-wrap">
        <Button variant="link" className="h-auto p-0 text-[11px] text-muted-foreground" onClick={() => onOpenDialog('help')}>Help & support</Button>
        <Button variant="link" className="h-auto p-0 text-[11px] text-muted-foreground" onClick={() => onOpenDialog('privacy')}>Privacy policy</Button>
        {isAdmin && <Link href="/admin" className="inline-flex items-center gap-1.5 hover:text-foreground"><Settings size={12} />Admin workspace</Link>}
      </div>
    </div>
  </footer>;
}
