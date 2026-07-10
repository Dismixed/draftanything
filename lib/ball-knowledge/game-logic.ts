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

export function getCountdownText(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const diff = tomorrow.getTime() - now.getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}
