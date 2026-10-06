/** Content zoom levels offered in the player (1 = 100%). */
export const ZOOM_LEVELS = [0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2] as const;

const STORAGE_KEY = 'ns-player-zoom';

/** Last zoom the learner chose on this device (per-device convenience only). */
export function readStoredZoom(): number {
  if (typeof window === 'undefined') return 1;
  try {
    const value = Number(window.localStorage.getItem(STORAGE_KEY));
    return (ZOOM_LEVELS as readonly number[]).includes(value) ? value : 1;
  } catch {
    return 1;
  }
}

export function storeZoom(value: number) {
  try { window.localStorage.setItem(STORAGE_KEY, String(value)); } catch { /* storage unavailable */ }
}

export function stepZoom(current: number, direction: 1 | -1): number {
  const levels = ZOOM_LEVELS as readonly number[];
  const index = levels.indexOf(current);
  const next = index === -1 ? levels.indexOf(1) : index + direction;
  return levels[Math.max(0, Math.min(levels.length - 1, next))]!;
}
