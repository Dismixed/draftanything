/** What Dead Reckoning keeps on the device. Every read and write is best-effort. */

import type { Guess } from "./scoring";

const DAY_KEY = (date: string) => `dead-reckoning:v2:day:${date}`;
const FINISHED_KEY = "dead-reckoning:v1:finished";

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the game carries on without it */
  }
}

function isGuess(g: unknown): g is Guess {
  return g === null || (typeof g === "number" && g > 0 && Number.isFinite(g));
}

/** Today's guesses so far, in leg order. */
export function loadGuesses(date: string): Guess[] {
  const raw = read(DAY_KEY(date));
  if (!Array.isArray(raw)) return [];
  const out: Guess[] = [];
  for (const g of raw) {
    if (!isGuess(g)) break;
    out.push(g);
  }
  return out;
}

export function saveGuesses(date: string, guesses: Guess[]) {
  write(DAY_KEY(date), guesses);
}

export function loadFinishedDays(): string[] {
  const raw = read(FINISHED_KEY);
  return Array.isArray(raw) ? raw.filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) : [];
}

export function markFinished(date: string) {
  const days = loadFinishedDays();
  if (!days.includes(date)) write(FINISHED_KEY, [...days, date].sort().slice(-400));
}

/** Current streak (ending today or yesterday) and the longest run of consecutive days. */
export function streaks(days: readonly string[], today: string): { current: number; longest: number } {
  const n = (d: string) => Math.round(Date.parse(`${d}T00:00:00Z`) / 86_400_000);
  const set = new Set(days.map(n));
  let longest = 0;
  for (const d of set) {
    if (set.has(d - 1)) continue;
    let len = 1;
    while (set.has(d + len)) len++;
    longest = Math.max(longest, len);
  }
  let end = n(today);
  if (!set.has(end)) end -= 1;
  let current = 0;
  while (set.has(end - current)) current++;
  return { current, longest };
}
