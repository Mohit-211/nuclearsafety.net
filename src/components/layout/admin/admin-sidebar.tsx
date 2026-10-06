'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, CircleHelp, X, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogoutButton } from '../logout-button';
import type { AdminShellProps } from './admin-shell';
import { adminNavigation, isAdminNavActive } from './navigation';

export function AdminSidebar({ user, scopeLabel, nav, counts, open, onClose, onHelp }: Pick<AdminShellProps, 'user' | 'scopeLabel' | 'nav' | 'counts'> & { open: boolean; onClose: () => void; onHelp: () => void }) {
  const path = usePathname();
  const items = adminNavigation.filter(item => nav.includes(item.key));

  return <>
    {open && <div className="sidebar-overlay" onClick={onClose} />}
    <aside className={`app-sidebar ${open ? 'is-open' : ''}`}>
      <Button variant="ghost" size="icon" className="mobile-close" aria-label="Close navigation" onClick={onClose}><X /></Button>
      <Link href="/admin" className="brand">
        <span className="brand-mark"><ShieldCheck size={35} strokeWidth={1.6} /></span>
        <span className="brand-name">nuclearsafety<span className="font-normal">.net</span><small>{scopeLabel.toUpperCase()}</small></span>
      </Link>
      <div className="nav-label">Admin console</div>
      <nav aria-label="Admin navigation">
        {items.map(({ key, href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`nav-item ${isAdminNavActive(path, href) ? 'active' : ''}`} aria-current={path === href ? 'page' : undefined} onClick={onClose}>
            <Icon />{label}{counts[key] !== undefined && <span className="nav-count">{counts[key]}</span>}
          </Link>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={onHelp}><CircleHelp />Help & support</Button>
        <Link href="/" className="nav-item"><GraduationCap />Learner workspace</Link>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground px-4 mt-6"><ShieldCheck size={14} /> A safer future through learning</div>
      </div>
      <div className="sidebar-profile">
        <span className="avatar">{user.initials}</span>
        <div className="flex-1 min-w-0"><p className="text-xs font-semibold truncate">{user.name}</p><p className="text-[10px] text-muted-foreground mt-1">{user.roleLabel}</p></div>
        <LogoutButton className="text-[11px] px-2 text-[var(--sidebar-fg)] hover:bg-[var(--sidebar-hover)] hover:text-white" />
      </div>
    </aside>
  </>;
}
