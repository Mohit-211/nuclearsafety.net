import { describe, expect, it } from 'vitest';
import { hit, isLimited, rateLimit, resetLimit } from '@/lib/auth/rate-limit';

describe('rate limiter', () => {
  it('limits only after the threshold of recorded failures', () => {
    const key = `t:${Math.random()}`;
    for (let i = 0; i < 7; i++) hit(key, 60_000);
    expect(isLimited(key, 8)).toBe(false);
    hit(key, 60_000);
    expect(isLimited(key, 8)).toBe(true);
    resetLimit(key);
    expect(isLimited(key, 8)).toBe(false);
  });

  it('rateLimit allows exactly `limit` events per window', () => {
    const key = `t:${Math.random()}`;
    const results = Array.from({ length: 4 }, () => rateLimit(key, 3, 60_000));
    expect(results).toEqual([true, true, true, false]);
  });
});
