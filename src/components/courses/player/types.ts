export type PlayerPhase = 'not-started' | 'in-progress' | 'completed';

export const phaseLabel: Record<PlayerPhase, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  completed: 'Completed',
};

/** What the player page receives from the server. */
export type PlayerCourse = {
  id: number;
  code: string;
  title: string;
  category: string;
  duration: string;
  moduleCount: number;
  /** The learner's certificate PDF for this course (resolved when clicked, so valid right after completion). */
  certificateHref: string;
  /** A certificate existed when the page loaded (completions from before certificates may not have one yet). */
  hasCertificate: boolean;
};

export type PlayerLaunch = {
  attemptId: number;
  scormVersion: '1.2' | '2004';
  launchUrl: string;
  initialCmi: Record<string, unknown>;
  review: boolean;
  /** Server-side status at launch time. */
  phase: PlayerPhase;
  progress: number | null;
};
