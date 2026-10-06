import { BookOpen, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { courses, statusClass } from './mock-data';

export function CourseTable({ items, onSelect }: { items: typeof courses; onSelect: (course: typeof courses[number]) => void }) {
  return <div className="table-wrap"><table className="training-table">
    <thead><tr><th>Course</th><th>Status</th><th>Progress</th><th>Due</th><th aria-label="Actions"/></tr></thead>
    <tbody>{items.map(c => <tr key={c.id}>
      <td><div className="table-course"><span className="table-course-icon"><BookOpen size={16}/></span><div><strong>{c.title}</strong><small>{c.id} · {c.category}</small></div></div></td>
      <td><span className={`badge ${statusClass(c.status)}`}>{c.status}</span></td>
      <td><div className="table-progress"><div className="progress-track" role="progressbar" aria-label={`${c.title} progress`} aria-valuenow={c.progress} aria-valuemin={0} aria-valuemax={100}><div className={`progress-fill ${c.progress===100?'p100':''}`} style={c.progress>0?{width:`${c.progress}%`}:undefined}/></div><span>{c.progress}%</span></div></td>
      <td className="whitespace-nowrap">{c.due}</td>
      <td className="text-right"><Button size="sm" variant="outline" onClick={()=>onSelect(c)}>Open <ArrowRight size={13}/></Button></td>
    </tr>)}</tbody>
  </table></div>;
}
