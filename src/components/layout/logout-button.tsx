import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logout } from '@/lib/actions/auth';

/** Sign-out is a POST (Server Action) so it cannot be triggered by a cross-site link. */
export function LogoutButton({ className }: { className?: string }) {
  return <form action={logout}>
    <Button type="submit" variant="ghost" size="sm" className={className}><LogOut size={15} />Log out</Button>
  </form>;
}
