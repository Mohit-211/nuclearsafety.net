'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { createScormRuntime, type RuntimeStatus, type ScormRuntime } from '@/lib/scorm/runtime';
import { PlayerTopbar } from './player-topbar';
import { PlayerStage, type StageView } from './player-stage';
import { PlayerNavbar } from './player-navbar';
import type { PlayerCourse, PlayerLaunch, PlayerPhase } from './types';
import { readStoredZoom, stepZoom, storeZoom } from './zoom';

/** Learner-facing phase from runtime status (completion must not be a failed result). */
function phaseFrom(s: RuntimeStatus, current: PlayerPhase): PlayerPhase {
  if (current === 'completed') return 'completed';
  if (s.completionStatus === 'completed' && s.successStatus !== 'failed') return 'completed';
  return 'in-progress';
}

/**
 * Course player shell: platform chrome around the SCORM content iframe. All SCORM
 * communication goes through lib/scorm/runtime (scorm-again); this component only
 * reflects status and manages the session lifecycle (start, exit, unload).
 */
export function CoursePlayer({ course, launch }: { course: PlayerCourse; launch: PlayerLaunch }) {
  const router = useRouter();
  const runtime = useRef<ScormRuntime | null>(null);
  const [view, setView] = useState<StageView>('intro');
  const [phase, setPhase] = useState<PlayerPhase>(launch.phase);
  const [progress, setProgress] = useState<number | null>(launch.progress);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [launchError, setLaunchError] = useState('');
  const [confirmExit, setConfirmExit] = useState(false);
  // Only used once the learner starts the course (client-side), so reading storage here is hydration-safe.
  const [zoom, setZoom] = useState(readStoredZoom);
  const changeZoom = (direction: 1 | -1 | 0) => {
    const next = direction === 0 ? 1 : stepZoom(zoom, direction);
    setZoom(next);
    storeZoom(next);
  };

  const onStatus = useCallback((s: RuntimeStatus) => {
    setPhase(p => phaseFrom(s, p));
    setProgress(p => (s.completionStatus === 'completed' && s.successStatus !== 'failed') ? 100
      : s.progressMeasure !== null ? Math.max(p ?? 0, Math.min(99, Math.round(s.progressMeasure * 100))) : p);
  }, []);

  // Install the SCORM API before the iframe loads; tear it down on leave.
  useEffect(() => {
    if (view !== 'loading') return;
    let cancelled = false;
    createScormRuntime({
      version: launch.scormVersion,
      attemptId: launch.attemptId,
      initialCmi: launch.initialCmi,
      callbacks: {
        onStatus,
        onSaved: at => { setSavedAt(at); setSaveError(false); },
        onSaveError: () => setSaveError(true),
        onTerminated: s => { onStatus(s); setView('closed'); router.refresh(); },
      },
    }).then(rt => {
      if (cancelled) { rt.destroy(); return; }
      runtime.current = rt;
      setView('playing');
    }).catch(err => {
      console.error('[player] runtime failed to start', err);
      setLaunchError('The course player could not start. Please reload the page or try another browser.');
      setView('error');
    });
    return () => { cancelled = true; };
  }, [view, launch, onStatus, router]);

  // Final commit when the tab is closed or navigated away (sent with sendBeacon).
  useEffect(() => {
    const finish = () => runtime.current?.finish();
    window.addEventListener('pagehide', finish);
    return () => {
      window.removeEventListener('pagehide', finish);
      finish();
      runtime.current?.destroy();
      runtime.current = null;
    };
  }, []);

  const exit = () => {
    runtime.current?.finish();
    router.push(`/courses/${course.id}`);
    router.refresh();
  };
  // Ask for confirmation only while a SCORM session is actually open.
  const requestExit = () => {
    const rt = runtime.current;
    if (view === 'playing' && rt?.isInitialized() && !rt.isTerminated()) setConfirmExit(true);
    else exit();
  };

  return <div className="player-page">
    <PlayerTopbar course={course} phase={phase} progress={progress} onExit={requestExit} />
    <PlayerStage course={course} phase={phase} view={view} launchUrl={launch.launchUrl} review={launch.review} error={launchError} zoom={zoom}
      onStart={() => setView('loading')} onReopen={() => window.location.reload()} onExit={exit}
      onFrameError={() => { setLaunchError('The course content could not be loaded.'); setView('error'); }} />
    <PlayerNavbar view={view} phase={phase} savedAt={savedAt} saveError={saveError} review={launch.review} zoom={zoom} onZoom={changeZoom} onExit={requestExit} />
    <p className="player-note"><ShieldCheck size={12}/> Your progress is saved automatically while you learn.</p>
    <ConfirmDialog open={confirmExit} onOpenChange={setConfirmExit} title="Exit course?"
      description="Your progress will be saved and you can resume where you left off." confirmLabel="Save and exit" cancelLabel="Keep learning" onConfirm={exit}/>
  </div>;
}
