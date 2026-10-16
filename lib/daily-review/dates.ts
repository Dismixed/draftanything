/** Days shown for review: today through today + 9. */
export const REVIEW_WINDOW_DAYS = 10;

export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function reviewWindow(today: string): string[] {
  return Array.from({ length: REVIEW_WINDOW_DAYS }, (_, i) => addDays(today, i));
}

/** Today's daily may already have been played, so only later days can change. */
export function isLocked(date: string, today: string): boolean {
  return date <= today;
}
