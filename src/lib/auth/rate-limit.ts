/*
 * Minimal fixed-window in-memory rate limiter. Adequate for a single PM2
 * process; if the app is ever clustered, move this to MySQL or nginx limit_req.
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

/** Returns true if the action is allowed, false when the limit is exceeded. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}
