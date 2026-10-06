'use client';

import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function FilterChips<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (value: T) => void }) {
  return <>
    {options.map(f => (
      <Button key={f} variant="outline" size="sm" className={`filter-chip ${value === f ? 'filter-active' : ''}`} onClick={() => onChange(f)}>{f}</Button>
    ))}
  </>;
}

export function SearchBox({ value, onChange, placeholder, label }: { value: string; onChange: (value: string) => void; placeholder: string; label: string }) {
  return <label className="search-box flex items-center gap-2">
    <Search size={14} className="text-muted-foreground shrink-0" />
    <input
      type="search"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={label}
      className="w-full bg-transparent text-[12px] outline-none placeholder:text-muted-foreground"
    />
  </label>;
}

export function FilterSelect({ value, onChange, label, children }: { value: string; onChange: (value: string) => void; label: string; children: React.ReactNode }) {
  return <select value={value} onChange={e => onChange(e.target.value)} aria-label={label} className="course-select">
    {children}
  </select>;
}
