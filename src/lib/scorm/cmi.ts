import type { PackageItem, ScormVersion } from './manifest';

/*
 * Mapping between scorm-again CMI trees and our persisted attempt state
 * (pure — shared by the commit endpoint, the launch service and tests).
 */

type Cmi = Record<string, unknown>;

export type CompletionStatus = 'not attempted' | 'incomplete' | 'completed' | 'unknown';
export type SuccessStatus = 'passed' | 'failed' | 'unknown';

export type NormalizedState = {
  completionStatus: CompletionStatus;
  successStatus: SuccessStatus;
  scoreRaw: number | null;
  scoreMin: number | null;
  scoreMax: number | null;
  scoreScaled: number | null;
  progressMeasure: number | null;
  location: string | null;
  exit: string | null;
  /** Present only when the runtime reported total_time (on terminate). */
  totalTimeRaw: string | null;
  totalTimeSeconds: number | null;
};

const obj = (v: unknown): Cmi => (v && typeof v === 'object' ? (v as Cmi) : {});
const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : typeof v === 'number' ? String(v) : null);
const num = (v: unknown): number | null => {
  const s = str(v);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/** SCORM 1.2 CMITimespan "HHHH:MM:SS.SS" → seconds. */
export function parseScorm12Time(v: string | null): number | null {
  const m = v?.match(/^(\d{2,4}):(\d{2}):(\d{2})(\.\d{1,2})?$/);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + (m[4] ? Number(m[4]) : 0);
}

/** SCORM 2004 ISO 8601 duration "P[nY][nM][nD][T[nH][nM][n.nS]]" → seconds. */
export function parseIsoDuration(v: string | null): number | null {
  const m = v?.match(/^P(?:(\d+(?:\.\d+)?)Y)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
  if (!m || v === 'P' || v?.endsWith('T')) return null;
  const [, y, mo, d, h, mi, s] = m.map(x => (x ? Number(x) : 0));
  return Math.round(y! * 31_536_000 + mo! * 2_592_000 + d! * 86_400 + h! * 3600 + mi! * 60 + s!);
}

/** Extract the reportable state from a committed CMI tree. */
export function normalizeCmi(version: ScormVersion, cmiInput: unknown): NormalizedState {
  const cmi = obj(cmiInput);
  if (version === '1.2') {
    const core = obj(cmi.core);
    const score = obj(core.score);
    const lessonStatus = (str(core.lesson_status) ?? 'not attempted').toLowerCase();
    // SCORM 1.2 folds completion and success into lesson_status; split them back apart.
    const completion: CompletionStatus =
      ['passed', 'completed', 'failed'].includes(lessonStatus) ? 'completed'
        : lessonStatus === 'incomplete' || lessonStatus === 'browsed' ? 'incomplete'
          : 'not attempted';
    const success: SuccessStatus = lessonStatus === 'passed' ? 'passed' : lessonStatus === 'failed' ? 'failed' : 'unknown';
    const totalTimeRaw = str(core.total_time);
    return {
      completionStatus: completion,
      successStatus: success,
      scoreRaw: num(score.raw), scoreMin: num(score.min), scoreMax: num(score.max), scoreScaled: null,
      progressMeasure: null,
      location: str(core.lesson_location),
      exit: str(core.exit),
      totalTimeRaw,
      totalTimeSeconds: parseScorm12Time(totalTimeRaw),
    };
  }
  const score = obj(cmi.score);
  const completionRaw = (str(cmi.completion_status) ?? 'unknown').toLowerCase();
  const successRaw = (str(cmi.success_status) ?? 'unknown').toLowerCase();
  const totalTimeRaw = str(cmi.total_time);
  return {
    completionStatus: (['not attempted', 'incomplete', 'completed', 'unknown'].includes(completionRaw) ? completionRaw : 'unknown') as CompletionStatus,
    successStatus: (['passed', 'failed'].includes(successRaw) ? successRaw : 'unknown') as SuccessStatus,
    scoreRaw: num(score.raw), scoreMin: num(score.min), scoreMax: num(score.max), scoreScaled: num(score.scaled),
    progressMeasure: num(cmi.progress_measure),
    location: str(cmi.location),
    exit: str(cmi.exit),
    totalTimeRaw,
    totalTimeSeconds: parseIsoDuration(totalTimeRaw),
  };
}

export type StoredOutcome = { completionStatus: string; successStatus: string };

/**
 * Merge a new commit into the stored outcome. Completion and a pass are sticky:
 * once a learner completed/passed, later sessions (e.g. reviewing) cannot undo it.
 */
export function mergeOutcome(prev: StoredOutcome, next: NormalizedState): { completionStatus: CompletionStatus; successStatus: SuccessStatus } {
  const completionStatus: CompletionStatus = prev.completionStatus === 'completed' ? 'completed' : next.completionStatus;
  const successStatus: SuccessStatus = prev.successStatus === 'passed' ? 'passed'
    : next.successStatus !== 'unknown' ? next.successStatus
      : (prev.successStatus as SuccessStatus);
  return { completionStatus, successStatus };
}

/** Platform rule: a course counts as completed when SCORM reports completion and the learner did not fail. */
export function isCourseComplete(o: StoredOutcome): boolean {
  return o.completionStatus === 'completed' && o.successStatus !== 'failed';
}

/** Score as a 0–100 percentage, when the package reported one. */
export function scorePercent(s: { scoreScaled: number | null; scoreRaw: number | null; scoreMin: number | null; scoreMax: number | null }): number | null {
  if (s.scoreScaled !== null) return Math.round(s.scoreScaled * 100);
  if (s.scoreRaw === null) return null;
  const min = s.scoreMin ?? 0;
  const max = s.scoreMax ?? 100;
  if (max <= min) return Math.round(s.scoreRaw);
  return Math.round(((s.scoreRaw - min) / (max - min)) * 100);
}

/** Progress percentage, or null when the package does not report progress. */
export function progressPercent(s: StoredOutcome & { progressMeasure: number | null }): number | null {
  if (isCourseComplete(s)) return 100;
  if (s.progressMeasure !== null) return Math.max(0, Math.min(99, Math.round(s.progressMeasure * 100)));
  if (s.completionStatus === 'not attempted') return 0;
  return null;
}

export type ResumeInput = {
  version: ScormVersion;
  storedCmi: string | null;
  totalTimeRaw: string | null;
  lastExit: string | null;
  learner: { id: number; name: string };
  item: Pick<PackageItem, 'masteryScore' | 'dataFromLms' | 'completionThreshold'> | undefined;
  review: boolean;
};

/** Format "First Last" as SCORM's conventional "Last, First". */
function scormName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts.at(-1)}, ${parts.slice(0, -1).join(' ')}` : name.trim();
}

/** Build the CMI JSON passed to scorm-again's loadFromJSON() before launch. */
export function buildLaunchCmi(input: ResumeInput): Cmi {
  let stored: Cmi = {};
  if (input.storedCmi) {
    try { stored = obj(JSON.parse(input.storedCmi)); } catch { stored = {}; }
  }
  // First launch → ab-initio. Later launches resume when the last session suspended
  // (or never terminated cleanly, e.g. the browser closed); otherwise entry is "".
  const entry = input.storedCmi === null ? 'ab-initio'
    : input.lastExit === 'suspend' || input.lastExit === null ? 'resume' : '';
  const mode = input.review ? 'review' : 'normal';
  const credit = input.review ? 'no-credit' : 'credit';

  if (input.version === '1.2') {
    const core = { ...obj(stored.core) };
    delete core.session_time; delete core.exit; delete core.entry; delete core.total_time;
    const studentData = { ...obj(stored.student_data) };
    if (input.item?.masteryScore) studentData.mastery_score = input.item.masteryScore;
    return {
      ...stored,
      launch_data: input.item?.dataFromLms ?? '',
      student_data: studentData,
      core: {
        ...core,
        student_id: String(input.learner.id),
        student_name: scormName(input.learner.name),
        entry,
        credit,
        lesson_mode: mode,
        ...(input.totalTimeRaw ? { total_time: input.totalTimeRaw } : {}),
      },
    };
  }
  const next: Cmi = { ...stored };
  delete next.session_time; delete next.exit; delete next.entry; delete next.total_time;
  return {
    ...next,
    learner_id: String(input.learner.id),
    learner_name: scormName(input.learner.name),
    entry,
    credit,
    mode,
    launch_data: input.item?.dataFromLms ?? '',
    ...(input.item?.completionThreshold ? { completion_threshold: input.item.completionThreshold } : {}),
    ...(input.totalTimeRaw ? { total_time: input.totalTimeRaw } : {}),
  };
}
