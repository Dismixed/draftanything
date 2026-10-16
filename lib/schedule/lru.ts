/**
 * Least-recently-used ordering for daily content rotation.
 *
 * Orders a pool so that never-used items come first (in pool order) and
 * used items follow ordered by oldest last-used date ascending. Ties keep
 * pool order (the sort is stable).
 *
 * Date strings are ISO `YYYY-MM-DD`, which compare correctly lexicographically.
 */

export function orderByLru<T>(
  items: readonly T[],
  getKey: (item: T) => string,
  lastUsedByKey: ReadonlyMap<string, string | null>,
): T[] {
  const neverUsed: T[] = [];
  const used: { item: T; lastUsed: string }[] = [];

  for (const item of items) {
    const lastUsed = lastUsedByKey.get(getKey(item)) ?? null;
    if (lastUsed === null) {
      neverUsed.push(item);
    } else {
      used.push({ item, lastUsed });
    }
  }

  used.sort((a, b) => (a.lastUsed < b.lastUsed ? -1 : a.lastUsed > b.lastUsed ? 1 : 0));

  return [...neverUsed, ...used.map((entry) => entry.item)];
}

export function pickLru<T>(
  items: readonly T[],
  getKey: (item: T) => string,
  lastUsedByKey: ReadonlyMap<string, string | null>,
): T | null {
  return orderByLru(items, getKey, lastUsedByKey)[0] ?? null;
}

/**
 * Key → latest date it ran strictly before `date`. Rows on or after `date`
 * do not count, so a future booking does not hide an item from an earlier day.
 */
export function lastUsedBefore(
  rows: readonly { key: string; date: string }[],
  date: string,
): Map<string, string> {
  const lastUsed = new Map<string, string>();
  for (const row of rows) {
    if (row.date >= date) continue;
    const previous = lastUsed.get(row.key);
    if (!previous || row.date > previous) lastUsed.set(row.key, row.date);
  }
  return lastUsed;
}
