/** The day's voyage: which seven questions, and the voyage number. */

/** Voyage 1 sailed on this day. */
export const LAUNCH_DATE = "2026-11-16";

const MS_PER_DAY = 86_400_000;

export interface Leg {
  id: string;
  category: string;
  prompt: string;
  unit: string;
  clue: string;
  answer: number;
  fact: string;
  source: string;
}

export function daysSinceLaunch(date: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${LAUNCH_DATE}T00:00:00Z`)) / MS_PER_DAY);
}

export function voyageNumber(date: string): number {
  return daysSinceLaunch(date) + 1;
}

/** A stable number in [0, 1) from a string. */
export function hashUnit(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
