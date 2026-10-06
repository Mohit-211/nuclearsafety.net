import { useState, type ReactNode } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { ShieldCheck, Bell, Menu, X, CheckCircle2, LogOut, Settings, CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const navigation = [
  { to: '/' as const, label: 'Dashboard' },
  { to: '/my-training' as const, label: 'My courses' },
  { to: '/profile' as const, label: 'Profile' },
];

function isActive(path: string, to: string) {
  if (to === '/') return path === '/';
  if (to === '/my-training') return ['/my-training', '/courses', '/course-library'].some(p => path.startsWith(p));
  return path.startsWith(to);
}

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const path = useRouterState({ select: s => s.location.pathname });
  const [menu, setMenu] = useState(false);
  const [dialog, setDialog] = useState<'notifications' | 'profile' | 'help' | 'privacy' | null>(null);

  return <div className="site-shell">
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="site-brand" aria-label="nuclearsafety.net home">
          <ShieldCheck size={26} strokeWidth={1.7} />
          <span>nuclearsafety<span className="font-normal opacity-80">.net</span></span>
        </Link>
        <nav className="site-nav" aria-label="Main navigation">
          {navigation.map(({ to, label }) => (
            <Link key={to} to={to} activeOptions={{ exact: true }} className={`site-nav-link ${isActive(path, to) ? 'is-active' : ''}`} aria-current={isActive(path, to) ? 'page' : undefined}>{label}</Link>
          ))}
        </nav>
        <div className="site-tools">
          <Button variant="ghost" size="icon" className="site-icon-btn notification-button" aria-label="Notifications" onClick={() => setDialog('notifications')}><Bell size={18} /><span className="notification-dot" /></Button>
          <Button variant="ghost" className="site-account" aria-label="Your profile" onClick={() => setDialog('profile')}><span className="avatar">JW</span><span className="site-account-name">James Wilson</span></Button>
          <Button variant="ghost" size="sm" className="site-logout" asChild><Link to="/login"><LogOut size={15} />Log out</Link></Button>
          <Button variant="ghost" size="icon" className="site-icon-btn site-menu-btn" aria-label={menu ? 'Close navigation' : 'Open navigation'} aria-expanded={menu} onClick={() => setMenu(m => !m)}>{menu ? <X /> : <Menu />}</Button>
        </div>
      </div>
      {menu && <nav className="site-mobile-nav" aria-label="Mobile navigation">
        {navigation.map(({ to, label }) => (
          <Link key={to} to={to} activeOptions={{ exact: true }} className={`site-mobile-link ${isActive(path, to) ? 'is-active' : ''}`} onClick={() => setMenu(false)}>{label}</Link>
        ))}
        <Link to="/login" className="site-mobile-link" onClick={() => setMenu(false)}><LogOut size={15} />Log out</Link>
      </nav>}
    </header>

    <main className="site-main" aria-label={title}>{children}</main>

    <footer className="site-footer">
      <div className="site-footer-inner">
        <span>© 2026 nuclearsafety.net</span>
        <div className="flex items-center gap-5 flex-wrap">
          <Button variant="link" className="h-auto p-0 text-[11px] text-muted-foreground" onClick={() => setDialog('help')}>Help & support</Button>
          <Button variant="link" className="h-auto p-0 text-[11px] text-muted-foreground" onClick={() => setDialog('privacy')}>Privacy policy</Button>
          <Link to="/admin" className="inline-flex items-center gap-1.5 hover:text-foreground"><Settings size={12} />Admin workspace</Link>
        </div>
      </div>
    </footer>

    <Dialog open={!!dialog} onOpenChange={open => { if (!open) setDialog(null); }}>
      <DialogContent className="modal-content">
        <DialogTitle>{dialog === 'notifications' ? 'Notifications' : dialog === 'profile' ? 'Your profile' : dialog === 'privacy' ? 'Privacy policy' : 'Help & support'}</DialogTitle>
        <DialogDescription>{dialog === 'notifications' ? 'Your latest training updates' : dialog === 'profile' ? 'Learner account details' : dialog === 'privacy' ? 'Preview information' : 'Training support'}</DialogDescription>
        {dialog === 'notifications' ? <>
          <div className="resource-row"><Bell size={20} /><div><h2>Training due soon</h2><p>Nuclear Safety Fundamentals · 16 Oct 2026</p></div></div>
          <div className="resource-row"><CheckCircle2 size={20} className="text-success" /><div><h2>Certificate available</h2><p>Introduction to Nuclear Operations</p></div></div>
        </> : dialog === 'profile' ? <div className="space-y-4 py-3">
          <div className="flex gap-3 items-center"><span className="avatar">JW</span><div><p className="font-semibold">James Wilson</p><p className="text-muted-foreground text-xs">Learner</p></div></div>
          <Button variant="outline" asChild onClick={() => setDialog(null)}><Link to="/profile">View profile</Link></Button>
        </div> : dialog === 'privacy'
          ? <p className="text-sm text-muted-foreground leading-7">This demonstration uses sample data only. No personal information or learning activity is stored.</p>
          : <p className="text-sm text-muted-foreground leading-7 flex gap-2"><CircleHelp size={16} className="shrink-0 mt-1" />For questions about your assigned training, contact your training coordinator.</p>}
      </DialogContent>
    </Dialog>
  </div>;
}
