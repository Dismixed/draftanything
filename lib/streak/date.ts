import { dailyDate } from "@/lib/daily-day";

/** Today's daily date; see `lib/daily-day.ts` for when the day turns over. */
export function getDateString(date: Date = new Date()): string {
  return dailyDate(date);
}
