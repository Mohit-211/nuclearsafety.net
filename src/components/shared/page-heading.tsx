import type { ReactNode } from 'react';

/** Page title block with an optional actions area on the right. */
export function PageHeading({ title, subtitle, children }: { title: ReactNode; subtitle?: ReactNode; children?: ReactNode }) {
  return <div className="page-heading">
    <div>
      {typeof title === 'string' ? <h1>{title}</h1> : title}
      {subtitle && <p className="subtitle">{subtitle}</p>}
    </div>
    {children}
  </div>;
}
