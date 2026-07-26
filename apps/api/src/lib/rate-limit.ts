/** Simple in-memory sliding-window rate limiter (per process). */
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
}) {
  const hits = new Map<string, number[]>();

  return {
    check(key: string): { ok: true } | { ok: false; retryAfterSec: number } {
      const now = Date.now();
      const windowStart = now - options.windowMs;
      const recent = (hits.get(key) ?? []).filter((t) => t > windowStart);
      if (recent.length >= options.max) {
        const retryAfterSec = Math.max(1, Math.ceil((recent[0]! + options.windowMs - now) / 1000));
        hits.set(key, recent);
        return { ok: false, retryAfterSec };
      }
      recent.push(now);
      hits.set(key, recent);
      return { ok: true };
    },
  };
}
