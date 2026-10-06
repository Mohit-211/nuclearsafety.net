import { AlertTriangle, CheckCircle2, CloudUpload, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StageView } from './player-stage';
import { phaseLabel, type PlayerPhase } from './types';

const time = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** Bottom status bar: save state and exit. Navigation inside the course is handled by the SCORM content itself. */
export function PlayerNavbar({ view, phase, savedAt, saveError, review, onExit }: { view: StageView; phase: PlayerPhase; savedAt: Date | null; saveError: boolean; review: boolean; onExit: () => void }) {
  return <footer className="player-navbar">
    <span className="player-step-count inline-flex items-center gap-2">
      {phase === 'completed' ? <CheckCircle2 size={14} className="text-success" /> : null}
      {phaseLabel[phase]}{review && view === 'playing' ? ' · Review mode' : ''}
    </span>
    <div className="player-step">
      <span className="player-step-name inline-flex items-center gap-1.5 justify-center">
        {saveError
          ? <><AlertTriangle size={13} className="text-warning" />Could not save progress — check your connection</>
          : savedAt ? <><CloudUpload size={13} />Progress saved at {time(savedAt)}</>
            : view === 'playing' ? 'Your progress is saved automatically' : ''}
      </span>
    </div>
    <Button variant="outline" onClick={onExit}><LogOut size={14}/>Exit</Button>
  </footer>;
}
