import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="text-link text-[11px] inline-flex items-center gap-1.5 mb-4"><ArrowLeft size={13} />{children}</Link>;
}
