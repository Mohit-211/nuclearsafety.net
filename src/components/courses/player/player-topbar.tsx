import { ArrowLeft } from 'lucide-react';
import { pct } from '@/components/shared/progress-track';
import { phaseLabel, type PlayerCourse, type PlayerPhase } from './types';

export function PlayerTopbar({ course, phase, progress, onExit }: { course: PlayerCourse; phase: PlayerPhase; progress: number | null; onExit: () => void }) {
  return <header className="player-topbar">
    <div className="player-topbar-left">
      <button type="button" className="player-exit" onClick={onExit}>
        <ArrowLeft size={15}/>Exit
      </button>
      <span className="player-divider"/>
      <div className="player-title">
        <span className="player-title-id">{course.code} · {course.category}</span>
        <h1>{course.title}</h1>
      </div>
    </div>
    <div className="player-topbar-progress">
      <span className={`player-state player-state-${phase}`}>{phaseLabel[phase]}</span>
      <div className="progress-track" role="progressbar" aria-label={`${course.title} progress`}
           aria-valuenow={progress ?? undefined} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-fill" style={{ width: `${progress ?? 0}%` }}/>
      </div>
      <span className="player-pct">{pct(progress)}<span className="player-pct-label"> complete</span></span>
    </div>
  </header>;
}
