import { dailyDate } from "@/lib/daily-day";
import { getCategoryForDayIndex, getDayIndex } from "./categories";

export const TOTAL_TIME = 60;
export const CLOCK_RADIUS = 28;
export const CLOCK_CIRCUMFERENCE = 2 * Math.PI * CLOCK_RADIUS;
export const MAX_SCORE = 200;

export function getDateString(date = new Date()): string {
  return dailyDate(date);
}

export function getTodayCategory(date = new Date()): string {
  // Noon on the daily's date, so the year-day matches the daily rather than the server's clock.
  return getCategoryForDayIndex(getDayIndex(new Date(`${dailyDate(date)}T12:00:00`)));
}
