export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Run async work over items with a concurrency cap. */
export async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  }

  const workers = Math.min(Math.max(1, limit), items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

const DEFAULT_HEADERS = {
  Accept: "application/json",
  "User-Agent": "Stim-Labs-AnyGuessr/1.0 (https://stimlabs.games)",
};

export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  options?: { retries?: number; baseDelayMs?: number },
): Promise<Response> {
  const retries = options?.retries ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 500;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { ...DEFAULT_HEADERS, ...(init.headers ?? {}) },
      });
      if (res.ok) return res;
      if (res.status !== 429 && res.status < 500) return res;
      lastError = new Error(`HTTP ${res.status} for ${url}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }

    if (attempt < retries) {
      await sleep(baseDelayMs * 2 ** attempt);
    }
  }

  throw lastError ?? new Error(`fetch failed: ${url}`);
}
