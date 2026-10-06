import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { ArrowLeft, BookOpen, CalendarDays, Clock3, Layers, Play, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/training/app-shell';
import { courses, courseModules, progressClass, statusClass } from '@/components/training/mock-data';
import station from '@/assets/nuclear-station.jpg';

export const Route = createFileRoute('/courses/$courseId/')({
  loader: ({ params }) => {
    const course = courses.find(c => c.id === params.courseId);
    if (!course) throw notFound();
    return { course };
  },
  head: ({ loaderData }) => loaderData
    ? { meta: [
        { title: `${loaderData.course.title} | nuclearsafety.net` },
        { name: 'description', content: loaderData.course.description },
        { property: 'og:title', content: `${loaderData.course.title} | nuclearsafety.net` },
        { property: 'og:description', content: loaderData.course.description },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ] }
    : { meta: [{ title: 'Course unavailable | nuclearsafety.net' }, { name: 'robots', content: 'noindex' }] },
  component: CourseDetail,
  notFoundComponent: CourseNotFound,
});

function CourseDetail() {
  const { course } = Route.useLoaderData();
  const started = course.progress > 0;
  const modules = courseModules(course);
  const done = Math.round(modules.length * course.progress / 100);
  const info: [string, string][] = [
    ['Category', course.category],
    ['Estimated duration', course.duration],
    ['Modules', `${course.modules}`],
    ['Due date', course.due],
    ['Status', course.status],
    ['Mandatory', course.required ? 'Yes' : 'No'],
  ];
  return <AppShell title="Course detail">
    <Link to="/my-training" className="text-link text-[11px] inline-flex items-center gap-1.5 mb-4"><ArrowLeft size={13}/>Back to my courses</Link>
    <article className="featured-course">
      <img className="course-photo" src={station} alt="Nuclear power station with cooling towers" width={1536} height={1024}/>
      <div className="featured-body">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="eyebrow">{course.category} · {course.id}</span>
          <span className={`badge ${statusClass(course.status)}`}>{course.status}</span>
        </div>
        <h1 className="featured-title">{course.title}</h1>
        <p className="course-detail-desc">{course.description}</p>
        <div className="course-meta mt-4">
          <span><Layers size={13}/>{course.modules} modules</span>
          <span><Clock3 size={13}/>{course.duration}</span>
          <span><CalendarDays size={13}/>Due {course.due}</span>
        </div>
        <div className="featured-footer">
          <span className="text-[10px] text-muted-foreground">{started ? `Next: ${modules[Math.min(done, modules.length - 1)]}` : 'Opens in the course player'}</span>
          <Link to="/courses/$courseId/play" params={{ courseId: course.id }}>
            <Button><Play size={14}/>{course.status==='Completed'?'Review course':started?'Continue training':'Start training'}</Button>
          </Link>
        </div>
      </div>
    </article>
    <div className="course-detail-grid">
      <section className="detail-panel">
        <h2>Course overview</h2>
        <p className="course-detail-desc mt-3">{course.description}</p>
        <p className="course-detail-desc mt-2">Work through each module in order and complete the short knowledge check at the end. This preview uses sample content — no learning progress is recorded.</p>
        <h2 className="mt-6 mb-1">Modules</h2>
        {modules.map((name, i) => <div className="lesson-row" key={name}>
          <span className="detail-module-index">{i + 1}</span>
          <span className="flex-1">{name}</span>
          {i < done ? <span className="badge completed">Completed</span> : i === done && started ? <span className="badge progress">Up next</span> : <span className="text-xs text-muted-foreground">5 min</span>}
        </div>)}
      </section>
      <div className="space-y-5">
        <section className="detail-panel">
          <h2 className="mb-2">Course progress</h2>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="detail-progress-pct">{course.progress}%</span>
            <span className="text-[11px] text-muted-foreground">complete</span>
          </div>
          <div className="progress-track" role="progressbar" aria-label={`${course.title} progress`} aria-valuenow={course.progress} aria-valuemin={0} aria-valuemax={100}>
            <div className={`progress-fill ${progressClass(course.progress)}`}/>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">{done} of {modules.length} modules completed</p>
        </section>
        <section className="detail-panel">
          <h2 className="mb-1">Course information</h2>
          <dl>{info.map(([label, value]) => <div className="detail-info-row" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </section>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground px-1"><BookOpen size={15} className="text-primary"/><span>Assigned by your training coordinator.</span></div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground px-1"><ShieldCheck size={15} className="text-primary"/><span>A completion certificate is available once all modules are finished.</span></div>
      </div>
    </div>
  </AppShell>;
}

function CourseNotFound() {
  return <AppShell title="Course detail">
    <div className="empty-state">
      <h1 className="text-lg font-semibold">Course unavailable</h1>
      <p className="mt-2 text-sm">This course is not in your assigned training.</p>
      <Link to="/my-training" className="text-link mt-4 inline-block">Back to my courses</Link>
    </div>
  </AppShell>;
}
