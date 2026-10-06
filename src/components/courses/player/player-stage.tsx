'use client';

import { useRef } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, PlayCircle, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PlayerCourse, PlayerPhase } from './types';
import { useContentReady } from './use-content-ready';

export type StageView = 'intro' | 'loading' | 'playing' | 'closed' | 'error';

/** Shown while the course runtime starts and over the frame until the content has painted. */
function LoadingCard({ slow }: { slow: boolean }) {
  return <div className="player-placeholder" role="status" aria-live="polite">
    <span className="player-placeholder-icon"><Loader2 size={26} strokeWidth={1.6} className="animate-spin"/></span>
    <h2>Loading your course…</h2>
    <p>{slow
      ? 'Still loading — courses with video and images can take a little longer, especially the first time. Thanks for your patience.'
      : 'Getting everything ready. This usually takes a few seconds.'}</p>
    <div className="player-loading-bar" aria-hidden="true"><span /></div>
  </div>;
}

export function PlayerStage({ course, phase, view, launchUrl, review, error, zoom, onStart, onReopen, onExit, onFrameError }: {
  course: PlayerCourse; phase: PlayerPhase; view: StageView; launchUrl: string; review: boolean; error: string; zoom: number;
  onStart: () => void; onReopen: () => void; onExit: () => void; onFrameError: () => void;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const { ready, elapsedMs } = useContentReady(frameRef, view === 'playing');

  if (view === 'playing') {
    return <main className="player-stage is-playing">
      <div className="player-frame-wrap">
        {/* Zoom = scale the frame and enlarge/shrink its box inversely, so the content reflows like browser zoom. */}
        <iframe ref={frameRef} className="player-frame" src={launchUrl} title={`${course.title} course content`}
          allow="fullscreen; autoplay" allowFullScreen onError={onFrameError}
          style={zoom === 1 ? undefined : { width: `${100 / zoom}%`, height: `${100 / zoom}%`, transform: `scale(${zoom})` }} />
        {!ready && <div className="player-frame-loader"><LoadingCard slow={elapsedMs > 12_000} /></div>}
      </div>
    </main>;
  }

  return <main className="player-stage">
    {view === 'loading' && <LoadingCard slow={false} />}

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
