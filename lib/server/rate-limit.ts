/**
 * Minimal fixed-window, per-key rate limiter.
 *
 * Replaces `express-rate-limit`, which is built around the Express req/res
 * cycle and cannot run inside a Next.js Route Handler.
 *
 * Caveats:
 *  - State lives on `globalThis` (survives dev hot-reload) but is per-process.
 *    Under multiple Node workers each keeps its own window. Acceptable for an
 *    abuse guard; for hard limits use a shared store (Redis / Upstash).
 *  - The per-IP key depends on `x-forwarded-for` being set by a proxy. With no
 *    proxy in front, all callers collapse onto one key — a stricter shared
 *    limit, not a bypass.
 */

type Window = { count: number; resetAt: number };

const globalForLimiter = globalThis as unknown as {
  __rateLimiter?: Map<string, Window>;
};

const windows: Map<string, Window> =
  globalForLimiter.__rateLimiter ?? (globalForLimiter.__rateLimiter = new Map());

/** Returns true if the request is allowed, false if the window is exhausted. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || now >= existing.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (existing.count >= limit) return false;

  existing.count += 1;
  return true;
}

/** Derives a per-client key from proxy headers. Falls back to a shared bucket. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}
