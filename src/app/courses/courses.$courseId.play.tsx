import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, MonitorPlay, PlayCircle, RotateCcw, ShieldCheck } from 'lucide-react';
import { ConfirmDialog } from '@/components/training/admin-dialogs';
import { Button } from '@/components/ui/button';
import { courses, courseModules } from '@/components/training/mock-data';

export const Route = createFileRoute('/courses/$courseId/play')({
  loader: ({ params }) => {
    const course = courses.find(c => c.id === params.courseId);
    if (!course) throw notFound();
    return { course };
  },
  head: ({ loaderData }) => loaderData
    ? { meta: [
        { title: `Training player — ${loaderData.course.title} | nuclearsafety.net` },
        { name: 'description', content: `Course player for ${loaderData.course.title}.` },
        { property: 'og:title', content: `Training player — ${loaderData.course.title} | nuclearsafety.net` },
        { property: 'og:description', content: `Course player for ${loaderData.course.title}.` },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ] }
    : { meta: [{ title: 'Course unavailable | nuclearsafety.net' }, { name: 'robots', content: 'noindex' }] },
  component: CoursePlayer,
  notFoundComponent: PlayerNotFound,
});

function CoursePlayer() {
  const { course } = Route.useLoaderData();
  const navigate = useNavigate();
  const modules = courseModules(course);
  const done = Math.round(modules.length * course.progress / 100);
  const [phase, setPhase] = useState<'not-started' | 'in-progress' | 'completed'>(
    course.progress === 0 ? 'not-started' : course.progress >= 100 ? 'completed' : 'in-progress');
  const [step, setStep] = useState(Math.min(done, modules.length - 1));
  const [confirmExit, setConfirmExit] = useState(false);
  const progress = phase === 'completed' ? 100 : phase === 'not-started' ? 0 : Math.max(course.progress, Math.round(step / modules.length * 100));
  const pct = phase === 'completed' ? 100 : Math.round((step + 1) / modules.length * 100);
  const last = step === modules.length - 1;
  const exit = () => navigate({ to: '/courses/$courseId', params: { courseId: course.id } });
  const stateLabel = phase === 'completed' ? 'Completed' : phase === 'in-progress' ? 'In progress' : 'Not started';
  return <div className="player-page">
    <header className="player-topbar">
      <div className="player-topbar-left">
        <button type="button" className="player-exit" onClick={() => phase === 'in-progress' ? setConfirmExit(true) : exit()}>
          <ArrowLeft size={15}/>Exit
        </button>
        <span className="player-divider"/>
        <div className="player-title">
          <span className="player-title-id">{course.id} · {course.category}</span>
          <h1>{course.title}</h1>
        </div>
      </div>
      <div className="player-topbar-progress">
        <span className={`player-state player-state-${phase}`}>{stateLabel}</span>
        <div className="progress-track" role="progressbar" aria-label={`${course.title} progress`}
             aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-fill" style={{ width: `${progress}%` }}/>
        </div>
        <span className="player-pct">{progress}%<span className="player-pct-label"> complete</span></span>
      </div>
    </header>
    <main className="player-stage">
      {phase === 'not-started' && <div className="player-placeholder">
        <span className="player-placeholder-icon"><PlayCircle size={26} strokeWidth={1.6}/></span>
        <h2>Ready to begin</h2>
        <p>{modules.length} modules · {course.duration}</p>
        <Button className="mt-5" onClick={() => { setStep(0); setPhase('in-progress'); }}>Start course<ArrowRight size={14}/></Button>
      </div>}
      {phase === 'in-progress' && <div className="player-placeholder">
        <span className="player-placeholder-icon"><MonitorPlay size={26} strokeWidth={1.6}/></span>
        <h2>Course content area</h2>
        <p>This space is reserved for the course player. Training content will load here in the full application — nothing is displayed in this preview.</p>
      </div>}
      {phase === 'completed' && <div className="player-placeholder player-complete">
        <span className="player-placeholder-icon"><CheckCircle2 size={26} strokeWidth={1.6}/></span>
        <h2>Course completed</h2>
        <p>All {modules.length} modules finished.</p>
        <div className="flex gap-2 mt-5 flex-wrap justify-center">
          <Button variant="outline" onClick={() => { setStep(0); setPhase('in-progress'); }}><RotateCcw size={14}/>Review course</Button>
          <Button onClick={exit}>Back to course</Button>
        </div>
      </div>}
    </main>
    <footer className="player-navbar">
      <Button variant="outline" disabled={phase !== 'in-progress' || step === 0} onClick={()=>setStep(s=>s-1)}>
        <ArrowLeft size={14}/>Previous
      </Button>
      <div className="player-step">
        <span className="player-step-count">{phase === 'in-progress' ? `Module ${step + 1} of ${modules.length}` : `${modules.length} modules`}</span>
        <span className="player-step-name">{phase === 'in-progress' ? modules[step] : stateLabel}</span>
        <div className="player-step-track">
          <div className="player-step-fill" style={{ width: `${phase === 'not-started' ? 0 : pct}%` }}/>
        </div>
      </div>
      {last && phase === 'in-progress'
        ? <Button className="player-next" onClick={()=>setPhase('completed')}><CheckCircle2 size={14}/>Finish</Button>
        : <Button className="player-next" disabled={phase !== 'in-progress'} onClick={()=>setStep(s=>s+1)}>Next<ArrowRight size={14}/></Button>}
    </footer>
    <p className="player-note"><ShieldCheck size={12}/> Preview only — no learning progress is recorded.</p>
    <ConfirmDialog open={confirmExit} onOpenChange={setConfirmExit} title="Exit course?"
      description="You can resume from this module later." confirmLabel="Exit course" cancelLabel="Keep learning" onConfirm={exit}/>
  </div>;
}

function PlayerNotFound() {
  return <div className="player-page">
    <main className="player-stage">
      <div className="empty-state">
        <h1 className="text-lg font-semibold">Course unavailable</h1>
        <p className="mt-2 text-sm">This course is not in your assigned training.</p>
        <Link to="/my-training" className="text-link mt-4 inline-block">Back to my courses</Link>
      </div>
    </main>
  </div>;
}
