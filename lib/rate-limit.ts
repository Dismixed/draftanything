interface RateLimitWindow {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitWindow>();

const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, window] of store.entries()) {
    if (now >= window.resetAt) {
      store.delete(key);
    }
  }
}

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

/** Exposed for testing — resets all rate limit state. */
export function _resetRateLimitStore(): void {
  store.clear();
  lastCleanup = Date.now();
}

/** Exposed for testing — access the internal store. */
export function _getRateLimitStore(): Map<string, RateLimitWindow> {
  return store;
}
