'use client';

import { useEffect, useState, type RefObject } from 'react';

/** Give up waiting (and reveal whatever is there) after this long. */
const MAX_WAIT_MS = 60_000;
const POLL_MS = 400;

/**
 * True once the frame (or the visible frame nested inside it — SCORM drivers such
 * as Rustici's scormdriver load the real content into an inner iframe) has painted
 * something: text, an image, video, canvas or SVG. Same-origin content only; if a
 * frame cannot be inspected we assume it is ready rather than hide it.
 */
function hasVisibleContent(win: Window | null, depth = 0): boolean {
  if (!win || depth > 4) return false;
  let doc: Document;
  try { doc = win.document; } catch { return true; }
  if (!doc || doc.readyState === 'loading' || !doc.body) return false;
  const frames = Array.from(doc.querySelectorAll('iframe, frame')).filter(f => {
    const r = f.getBoundingClientRect();
    return r.width > 40 && r.height > 40;
  }) as HTMLIFrameElement[];
  if (frames.length) return frames.some(f => hasVisibleContent(f.contentWindow, depth + 1));
  if ((doc.body.innerText ?? '').trim().length > 0) return true;
  return Array.from(doc.querySelectorAll('img, video, canvas, svg')).some(el => {
    const r = el.getBoundingClientRect();
    return r.width > 16 && r.height > 16;
  });
}

/**
 * Tracks whether the SCORM content inside `frameRef` has rendered yet, and how long
 * the learner has been waiting (so the loader can reassure them on slow starts).
 */
export function useContentReady(frameRef: RefObject<HTMLIFrameElement | null>, active: boolean) {
  const [ready, setReady] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!active) return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - started;
      setElapsedMs(elapsed);
      if (elapsed >= MAX_WAIT_MS || hasVisibleContent(frameRef.current?.contentWindow ?? null)) {
        setReady(true);
        window.clearInterval(timer);
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [active, frameRef]);

  return { ready: active && ready, elapsedMs };
}
