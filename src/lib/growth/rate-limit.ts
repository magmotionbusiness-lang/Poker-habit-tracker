/**
 * Fixed-window rate limiter for public endpoints (lead forms). In-memory per server
 * instance — a first line of defence; the leads table's unique (email, list) and the
 * honeypot do the rest. Swap for Upstash/Vercel KV if abuse ever shows up.
 */
export function createRateLimiter(limit: number, windowMs: number, max = 5000) {
  const hits = new Map<string, { n: number; reset: number }>();
  return function check(key: string, now = Date.now()): { ok: boolean; retryAfter: number } {
    const cur = hits.get(key);
    if (!cur || cur.reset <= now) {
      if (hits.size >= max) for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
      if (hits.size >= max) hits.delete(hits.keys().next().value!);
      hits.set(key, { n: 1, reset: now + windowMs });
      return { ok: true, retryAfter: 0 };
    }
    cur.n++;
    return cur.n <= limit
      ? { ok: true, retryAfter: 0 }
      : { ok: false, retryAfter: Math.ceil((cur.reset - now) / 1000) };
  };
}
