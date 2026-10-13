import { getCategoryForDayIndex, getDayIndex } from "./categories";

export const TOTAL_TIME = 60;
export const CLOCK_RADIUS = 28;
export const CLOCK_CIRCUMFERENCE = 2 * Math.PI * CLOCK_RADIUS;
export const MAX_SCORE = 200;

export function getDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function getTodayCategory(date = new Date()): string {
  return getCategoryForDayIndex(getDayIndex(date));
}
