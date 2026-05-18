/**
 * Simple module-level rate limiter for Next.js API routes.
 *
 * Uses a Map of { count, resetAt } buckets keyed by an arbitrary string.
 * Buckets are lazily created and reset after the window expires.
 *
 * Usage:
 *   const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
 *   const { allowed, retryAfterSec } = checkRateLimit(`delete:share:${ip}`, 10, 60_000);
 *   if (!allowed) return Response.json({ error: "Rate limit exceeded" }, {
 *     status: 429,
 *     headers: { "Retry-After": String(retryAfterSec) },
 *   });
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const _buckets = new Map<string, Bucket>();

/**
 * Check and record a rate-limit hit for `key`.
 *
 * @param key       Unique namespace — e.g. "delete:share:<ip>"
 * @param max       Maximum allowed requests within the window
 * @param windowMs  Sliding window in milliseconds
 */
export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = _buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    // New or expired bucket — start fresh
    _buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (bucket.count >= max) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}
