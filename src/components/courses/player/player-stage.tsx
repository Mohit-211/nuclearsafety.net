import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, PlayCircle, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PlayerCourse, PlayerPhase } from './types';

export type StageView = 'intro' | 'loading' | 'playing' | 'closed' | 'error';

export function PlayerStage({ course, phase, view, launchUrl, review, error, onStart, onReopen, onExit, onFrameError }: {
  course: PlayerCourse; phase: PlayerPhase; view: StageView; launchUrl: string; review: boolean; error: string;
  onStart: () => void; onReopen: () => void; onExit: () => void; onFrameError: () => void;
}) {
  if (view === 'playing') {
    return <main className="player-stage is-playing">
      <iframe className="player-frame" src={launchUrl} title={`${course.title} course content`} allow="fullscreen; autoplay" allowFullScreen onError={onFrameError} />
    </main>;
  }

  return <main className="player-stage">
    {view === 'loading' && <div className="player-placeholder">
      <span className="player-placeholder-icon"><Loader2 size={26} strokeWidth={1.6} className="animate-spin"/></span>
      <h2>Loading course…</h2>
    </div>}

    {view === 'error' && <div className="player-placeholder">
      <span className="player-placeholder-icon"><AlertTriangle size={26} strokeWidth={1.6}/></span>
      <h2>Something went wrong</h2>
      <p>{error || 'The course could not be started.'} Your saved progress is safe.</p>
      <div className="flex gap-2 mt-5 flex-wrap justify-center">
        <Button variant="outline" onClick={onReopen}><RotateCcw size={14}/>Try again</Button>
        <Button onClick={onExit}>Back to course</Button>
      </div>
    </div>}

    {view === 'intro' && phase !== 'completed' && <div className="player-placeholder">
      <span className="player-placeholder-icon"><PlayCircle size={26} strokeWidth={1.6}/></span>
      <h2>{phase === 'not-started' ? 'Ready to begin' : 'Welcome back'}</h2>
      <p>{phase === 'not-started'
        ? `${course.moduleCount ? `${course.moduleCount} module${course.moduleCount === 1 ? '' : 's'} · ` : ''}${course.duration}`
        : 'You can continue where you left off.'}</p>
      <Button className="mt-5" onClick={onStart}>{phase === 'not-started' ? 'Start course' : 'Continue course'}<ArrowRight size={14}/></Button>
    </div>}

    {(view === 'intro' || view === 'closed') && phase === 'completed' && <div className="player-placeholder player-complete">
      <span className="player-placeholder-icon"><CheckCircle2 size={26} strokeWidth={1.6}/></span>
      <h2>Course completed</h2>
      <p>{review && view === 'intro' ? 'You have completed this course. You can review it at any time — your result will not change. To take it again, request a retake from the course page.' : 'Well done. Your completion has been recorded and your certificate is available.'}</p>
      <div className="flex gap-2 mt-5 flex-wrap justify-center">
        <Button variant="outline" onClick={view === 'intro' ? onStart : onReopen}><RotateCcw size={14}/>Review course</Button>
        <Button onClick={onExit}>Back to course</Button>
      </div>
    </div>}

    {view === 'closed' && phase !== 'completed' && <div className="player-placeholder">
      <span className="player-placeholder-icon"><Save size={26} strokeWidth={1.6}/></span>
      <h2>Progress saved</h2>
      <p>The course has closed. You can resume where you left off at any time.</p>
      <div className="flex gap-2 mt-5 flex-wrap justify-center">
        <Button variant="outline" onClick={onReopen}><RotateCcw size={14}/>Re-open course</Button>
        <Button onClick={onExit}>Back to course</Button>
      </div>
    </div>}
  </main>;
}
