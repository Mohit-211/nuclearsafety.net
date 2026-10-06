/*
 * Minimal fixed-window in-memory rate limiter. Adequate for a single PM2
 * process; if the app is ever clustered, move this to MySQL or nginx limit_req.
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

function live(key: string, now: number) {
  const bucket = buckets.get(key);
  if (bucket && bucket.resetAt <= now) { buckets.delete(key); return undefined; }
  return bucket;
}

/** Record one event for `key`. */
export function hit(key: string, windowMs: number) {
  const now = Date.now();
  const bucket = live(key, now);
  if (bucket) bucket.count += 1;
  else buckets.set(key, { count: 1, resetAt: now + windowMs });
  if (buckets.size > 10_000) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

/** True when `key` has reached `limit` events in its current window (does not record). */
export function isLimited(key: string, limit: number): boolean {
  return (live(key, Date.now())?.count ?? 0) >= limit;
}

/** Record an event and report whether it is still within the limit. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  hit(key, windowMs);
  return !isLimited(key, limit + 1);
}

/** Forget a key (e.g. clear failed-login counters after a successful sign-in). */
export function resetLimit(key: string) {
  buckets.delete(key);
}
