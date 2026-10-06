'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, ArrowRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeading } from '@/components/shared/page-heading';
import { EmptyState } from '@/components/shared/states';
import type { LearnerCourse } from '@/lib/types';
import { CatalogCard, CourseCard } from './course-card';

const filters = ['All courses', 'In progress', 'Not started', 'Completed'];

/** "My courses" list, or the course library catalogue when `library` is set. */
export function CourseList({ courses, library = false }: { courses: LearnerCourse[]; library?: boolean }) {
  const [filter, setFilter] = useState('All courses');
  const [search, setSearch] = useState('');
  const items = courses.filter(c => (filter === 'All courses' || c.status === filter) && c.title.toLowerCase().includes(search.toLowerCase()));
  const clear = () => { setSearch(''); setFilter('All courses'); };

  return <>
    <PageHeading
      title={library ? 'Course library' : 'My courses'}
      subtitle={library ? 'Browse your available nuclear safety courses.' : 'Your assigned courses and learning progress.'}
    >
      {!library && <Link href="/course-library" className="text-link">Browse course library <ArrowRight size={14}/></Link>}
    </PageHeading>
    <div className="filter-bar">
      {filters.map(f => <Button variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)} key={f}>{f}</Button>)}
      <label className="search-box flex items-center gap-2">
        <Search size={14} className="text-muted-foreground"/>
        <input className="outline-none w-full bg-transparent" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses" aria-label="Search courses"/>
      </label>
    </div>
    {courses.length === 0 ? <EmptyState icon={<BookOpen size={22}/>} title="No courses assigned" description="Your training coordinator will assign courses here."/>
      : !items.length ? <EmptyState icon={<Search size={22}/>} title="No matching courses" description="Try a different search term or filter." action={<Button variant="outline" size="sm" onClick={clear}>Clear filters</Button>}/>
      : <div className="course-grid">{items.map(c => library ? <CatalogCard course={c} key={c.id}/> : <CourseCard course={c} key={c.id}/>)}</div>}
  </>;
}
