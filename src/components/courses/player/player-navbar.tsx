import { AlertTriangle, CheckCircle2, CloudUpload, LogOut, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StageView } from './player-stage';
import { phaseLabel, type PlayerPhase } from './types';
import { ZOOM_LEVELS } from './zoom';

const time = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** − 100% + : the percentage resets to 100%. */
function ZoomControls({ zoom, onZoom }: { zoom: number; onZoom: (next: 1 | -1 | 0) => void }) {
  return <div className="player-zoom" role="group" aria-label="Course zoom">
    <Button variant="ghost" size="icon" aria-label="Zoom out" title="Zoom out" disabled={zoom <= ZOOM_LEVELS[0]} onClick={() => onZoom(-1)}><ZoomOut size={16} /></Button>
    <button type="button" className="player-zoom-value" title="Reset zoom to 100%" aria-label={`Zoom ${Math.round(zoom * 100)}%, reset to 100%`} onClick={() => onZoom(0)}>
      {Math.round(zoom * 100)}%
    </button>
    <Button variant="ghost" size="icon" aria-label="Zoom in" title="Zoom in" disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]} onClick={() => onZoom(1)}><ZoomIn size={16} /></Button>
  </div>;
}

/** Bottom status bar: save state, zoom and exit. Navigation inside the course is handled by the SCORM content itself. */
export function PlayerNavbar({ view, phase, savedAt, saveError, review, zoom, onZoom, onExit }: {
  view: StageView; phase: PlayerPhase; savedAt: Date | null; saveError: boolean; review: boolean;
  zoom: number; onZoom: (next: 1 | -1 | 0) => void; onExit: () => void;
}) {
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
    <div className="flex items-center gap-3">
      {view === 'playing' && <ZoomControls zoom={zoom} onZoom={onZoom} />}
      <Button variant="outline" onClick={onExit}><LogOut size={14}/>Exit</Button>
    </div>
  </footer>;
}
