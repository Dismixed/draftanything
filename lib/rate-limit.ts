/**
 * Minimal in-memory rate limiter stub.
 *
 * Task 11 will replace this with a full Redis-backed implementation.
 * This stub establishes the call interface that routes depend on.
 *
 * In production, a single-server in-memory store is not sufficient — it
 * resets on restart and does not share state across instances. Use this only
 * as a placeholder until Task 11 ships.
 */

interface RateLimitWindow {
  count: number;
  resetAt: number;
}

// key → { count, resetAt }
const store = new Map<string, RateLimitWindow>();

function cleanup() {
  const now = Date.now();
  for (const [key, window] of store.entries()) {
    if (now >= window.resetAt) {
      store.delete(key);
    }
  }
}

/**
 * Checks whether `key` has exceeded `max` requests within `windowMs`.
 *
 * @returns `{ allowed: true }` when under the limit, or
 *          `{ allowed: false, retryAfterMs: number }` when the limit is hit.
 */
export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
): { allowed: true } | { allowed: false; retryAfterMs: number } {
  cleanup();

  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now >= existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (existing.count >= max) {
    return { allowed: false, retryAfterMs: existing.resetAt - now };
  }

  existing.count++;
  return { allowed: true };
}
