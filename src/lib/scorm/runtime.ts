/*
 * Browser-side SCORM runtime adapter — the ONLY place that talks to scorm-again.
 * It installs window.API (SCORM 1.2) or window.API_1484_11 (SCORM 2004) for the
 * same-origin content iframe, preloads persisted CMI state, commits to our API and
 * reports status changes back to the player UI.
 */

import type { ScormVersion } from './manifest';

export type RuntimeStatus = {
  completionStatus: string;
  successStatus: string;
  progressMeasure: number | null;
};

export type RuntimeCallbacks = {
  onStatus?: (status: RuntimeStatus) => void;
  onSaved?: (at: Date) => void;
  onSaveError?: () => void;
  onTerminated?: (status: RuntimeStatus) => void;
};

export type ScormRuntime = {
  /** True after the content called Initialize/LMSInitialize. */
  isInitialized: () => boolean;
  isTerminated: () => boolean;
  /** Commit + terminate on the content's behalf (exit button, page unload). Safe to call repeatedly. */
  finish: () => void;
  /** Remove the API from window. */
  destroy: () => void;
};

type AnyApi = {
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  loadFromJSON: (json: Record<string, unknown>) => void;
  isInitialized: () => boolean;
  isTerminated: () => boolean;
  cmi: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  LMSCommit?: (s: string) => string;
  LMSFinish?: (s: string) => string;
  Commit?: (s: string) => string;
  Terminate?: (s: string) => string;
};

declare global {
  interface Window { API?: unknown; API_1484_11?: unknown }
}

export async function createScormRuntime(opts: {
  version: ScormVersion;
  attemptId: number;
  initialCmi: Record<string, unknown>;
  callbacks: RuntimeCallbacks;
}): Promise<ScormRuntime> {
  const { version, attemptId, initialCmi, callbacks } = opts;

  const settings = {
    lmsCommitUrl: `/api/attempts/${attemptId}/commit`,
    autocommit: true,
    autocommitSeconds: 30,
    // Final (Terminate) commit is sent with sendBeacon and flagged so the server records exit/total_time.
    terminateCommitParam: 'terminate',
    autoCompleteLessonStatus: false,
    logLevel: 'ERROR' as const,
    xhrResponseHandler: (xhr: XMLHttpRequest) => {
      let ok = false;
      try { ok = xhr.status >= 200 && xhr.status < 300 && JSON.parse(xhr.responseText)?.result === true; } catch { ok = false; }
      if (ok) callbacks.onSaved?.(new Date()); else callbacks.onSaveError?.();
      return { result: ok, errorCode: ok ? 0 : 101 };
    },
  };

  let api: AnyApi;
  if (version === '1.2') {
    const { Scorm12API } = await import('scorm-again/scorm12');
    api = new Scorm12API(settings) as unknown as AnyApi;
  } else {
    const { Scorm2004API } = await import('scorm-again/scorm2004');
    api = new Scorm2004API(settings) as unknown as AnyApi;
  }
  api.loadFromJSON(initialCmi);

  const readStatus = (): RuntimeStatus => {
    if (version === '1.2') {
      const s = String(api.cmi.core?.lesson_status ?? '');
      return {
        completionStatus: ['passed', 'completed', 'failed'].includes(s) ? 'completed' : s === 'not attempted' ? 'not attempted' : 'incomplete',
        successStatus: s === 'passed' ? 'passed' : s === 'failed' ? 'failed' : 'unknown',
        progressMeasure: null,
      };
    }
    const pm = Number(api.cmi.progress_measure);
    return {
      completionStatus: String(api.cmi.completion_status || 'unknown'),
      successStatus: String(api.cmi.success_status || 'unknown'),
      progressMeasure: api.cmi.progress_measure !== '' && Number.isFinite(pm) ? pm : null,
    };
  };

  const emitStatus = () => callbacks.onStatus?.(readStatus());
  if (version === '1.2') {
    api.on('LMSSetValue.cmi.core.lesson_status', emitStatus);
    api.on('LMSFinish', () => callbacks.onTerminated?.(readStatus()));
  } else {
    api.on('SetValue.cmi.completion_status', emitStatus);
    api.on('SetValue.cmi.success_status', emitStatus);
    api.on('SetValue.cmi.progress_measure', emitStatus);
    api.on('Terminate', () => callbacks.onTerminated?.(readStatus()));
  }

  if (version === '1.2') window.API = api; else window.API_1484_11 = api;

  return {
    isInitialized: () => api.isInitialized(),
    isTerminated: () => api.isTerminated(),
    finish: () => {
      if (!api.isInitialized() || api.isTerminated()) return;
      // Commit synchronously first (no beacon size limit), then terminate.
      if (version === '1.2') { api.LMSCommit?.(''); api.LMSFinish?.(''); }
      else { api.Commit?.(''); api.Terminate?.(''); }
    },
    destroy: () => {
      if (version === '1.2') { if (window.API === api) delete window.API; }
      else if (window.API_1484_11 === api) delete window.API_1484_11;
    },
  };
}
