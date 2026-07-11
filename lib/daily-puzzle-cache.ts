/** Session cache for immutable daily puzzle payloads (same for everyone on a given date). */

export function readDailyPuzzleCache<T>(gameId: string, date: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`daily-puzzle:${gameId}:${date}`);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeDailyPuzzleCache<T>(
  gameId: string,
  date: string,
  payload: T,
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      `daily-puzzle:${gameId}:${date}`,
      JSON.stringify(payload),
    );
  } catch {
    // quota or private browsing
  }
}
