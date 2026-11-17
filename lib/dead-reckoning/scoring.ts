/** Scoring and tiers for Dead Reckoning. Shared by the client and the server. */

import { formatShort } from "./numbers";

/** A guess is one number, or nothing (left blank, or the clock ran out). */
export type Guess = number | null;

export const LEGS = 7;

/** A perfect reckoning crosses in a day, so par for the seven crossings is 7. */
export const PAR = 7;

export interface Tier {
  /** 0 is the best; 6 is Becalmed. */
  index: number;
  name: string;
  /** Days this crossing takes. */
  days: number;
}

/** The guess is within `ratio` of the answer (either side). */
const TIERS: ReadonlyArray<{ ratio: number; days: number; name: string }> = [
  { ratio: 1.1, days: 1, name: "Dead Reckoning" },
  { ratio: 1.25, days: 1.5, name: "True North" },
  { ratio: 1.5, days: 2, name: "Land Ho" },
  { ratio: 2, days: 2.5, name: "Off Course" },
  { ratio: 5, days: 3, name: "Lost at Sea" },
  { ratio: Infinity, days: 4, name: "Adrift" },
];

export const BECALMED: Tier = { index: 6, name: "Becalmed", days: 5 };

export const TIER_NAMES = [...TIERS.map((t) => t.name), BECALMED.name];

/** The most a voyage can take: every crossing becalmed. */
export const MAX_DAYS = LEGS * BECALMED.days;

export const FLAVOUR = [
  "right on the chart",
  "a fine reckoning",
  "close enough to see the shore",
  "a little off the line",
  "the stars were no help",
  "the sea had other plans",
  "not a breath of wind",
];

/** Share squares, best to worst, then blank. */
export const SQUARES = ["🟪", "🟦", "🟩", "🟨", "🟫", "⬛", "⬜"];

export function grade(g: Guess, answer: number): Tier {
  if (g === null) return BECALMED;
  const ratio = Math.max(g / answer, answer / g);
  const index = TIERS.findIndex((t) => ratio <= t.ratio + 1e-9);
  return { index, name: TIERS[index].name, days: TIERS[index].days };
}

/** Days at sea for a whole voyage. */
export function totalDays(guesses: readonly Guess[], answers: readonly number[]): number {
  return answers.reduce((sum, a, i) => sum + grade(guesses[i] ?? null, a).days, 0);
}

/** "1 day", "2½ days". */
export function dayStr(d: number): string {
  const whole = Math.floor(d);
  const half = d - whole >= 0.5;
  return `${whole || !half ? whole : ""}${half ? "½" : ""} ${d === 1 ? "day" : "days"}`;
}

/** How close, in words: "12% too high", "3.4× too low". */
export function closeness(g: Guess, answer: number): string {
  if (g === null) return "you left it blank";
  const r = g / answer;
  if (Math.abs(r - 1) < 0.005) return "spot on";
  if (r > 1) return r < 2 ? `${Math.round((r - 1) * 100)}% too high` : `${formatShort(r)}× too high`;
  return 1 / r < 2 ? `${Math.round((1 - r) * 100)}% too low` : `${formatShort(1 / r)}× too low`;
}

/** The tier table, for the "how long each crossing takes" panel. */
export function tierTable(): Array<{ index: number; name: string; within: string; days: number }> {
  return [
    ...TIERS.map((t, index) => ({
      index,
      name: t.name,
      within: t.ratio === Infinity ? "beyond 5×" : t.ratio >= 2 ? `within ${t.ratio}×` : `within ${Math.round((t.ratio - 1) * 100)}%`,
      days: t.days,
    })),
    { index: 6, name: BECALMED.name, within: "blank", days: BECALMED.days },
  ];
}

/** Share of `fleet` that took longer than `days`; ties count half. Null for an empty fleet. */
export function quickerThan(days: number, fleet: readonly number[]): number | null {
  if (fleet.length === 0) return null;
  let slower = 0;
  let tied = 0;
  for (const d of fleet) {
    if (d > days) slower++;
    else if (d === days) tied++;
  }
  return Math.round(((slower + tied / 2) / fleet.length) * 100);
}
