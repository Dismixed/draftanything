import { getDateString } from "./date";

export function computeStreak(
  playDates: string[],
  today = getDateString(),
): number {
  if (playDates.length === 0) return 0;

  const dateSet = new Set(playDates);
  const cursor = new Date(`${today}T12:00:00Z`);

  if (!dateSet.has(today)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  let streak = 0;
  while (dateSet.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}
