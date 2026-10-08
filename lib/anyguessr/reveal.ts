import { sharesBorder } from "./country-borders";

/** How close a round was, from a bullseye down to a skipped round. */
export type RevealTier = "exact" | "neighbour" | "close" | "warm" | "far" | "skipped";

export interface RevealInput {
  exact: boolean;
  surrendered?: boolean;
  roundScore: number;
  distanceKm: number;
  answerCca3: string;
  guessCca3: string | null;
}

/** Score at which a guess counts as close; the same line the passport stamps use. */
export const CLOSE_SCORE = 50;
const WARM_SCORE = 20;
/** Past this the guess was on the far side of the world. */
const OPPOSITE_KM = 9000;

export function revealTier(r: RevealInput): RevealTier {
  if (r.surrendered) return "skipped";
  if (r.exact) return "exact";
  if (sharesBorder(r.answerCca3, r.guessCca3)) return "neighbour";
  if (r.roundScore >= CLOSE_SCORE) return "close";
  if (r.roundScore >= WARM_SCORE) return "warm";
  return "far";
}

const BANNER: Record<RevealTier, string> = {
  exact: "Spot on",
  neighbour: "Next door!",
  close: "So close",
  warm: "Warm",
  far: "Way off",
  skipped: "Skipped",
};

/** The stamp's wording and the one-line comment under the answer. */
export function revealText(tier: RevealTier, distanceKm: number): { banner: string; quip: string } {
  const quip: Record<RevealTier, string> = {
    exact: "Straight to the pin.",
    neighbour: "Next door. Almost.",
    close: "Right neighbourhood.",
    warm: "Warm, not quite.",
    far: distanceKm > OPPOSITE_KM ? "The other side of the world." : "Not even close.",
    skipped: "On to the next one.",
  };
  return { banner: BANNER[tier], quip: quip[tier] };
}

/** Ink for the banner and quip: green for a bullseye, gold for a decent try, red for a miss. */
export function revealInk(tier: RevealTier): "ok" | "accent" | "bad" {
  if (tier === "exact") return "ok";
  if (tier === "far" || tier === "skipped") return "bad";
  return "accent";
}

const keepsStreak = (r: { exact: boolean; surrendered?: boolean; roundScore: number }) =>
  !r.surrendered && (r.exact || r.roundScore >= CLOSE_SCORE);

/**
 * The run of close-or-better rounds ending at the latest one. `current` is its length, and `broken`
 * is the length of the run the latest round just ended, when it did.
 */
export function roundStreak(results: readonly { exact: boolean; surrendered?: boolean; roundScore: number }[]): {
  current: number;
  broken: number;
} {
  const run = (end: number) => {
    let n = 0;
    for (let i = end; i >= 0 && keepsStreak(results[i]); i--) n++;
    return n;
  };
  const last = results.length - 1;
  if (last < 0) return { current: 0, broken: 0 };
  return keepsStreak(results[last]) ? { current: run(last), broken: 0 } : { current: 0, broken: run(last - 1) };
}

/** The beats of the reveal, in order. Each stage includes every earlier one. */
export const STAGE = { pin: 0, fly: 1, arc: 2, answer: 3, distance: 4, score: 5, verdict: 6, done: 7 } as const;

/**
 * When each beat starts, in milliseconds from the recap opening. A guess that missed has a line to
 * draw and further to fly; a bullseye or a skipped round goes straight to the answer.
 */
export function revealSchedule(missed: boolean): readonly { stage: number; at: number }[] {
  return missed
    ? [
        { stage: STAGE.fly, at: 350 },
        { stage: STAGE.arc, at: 1350 },
        { stage: STAGE.answer, at: 2050 },
        { stage: STAGE.distance, at: 2450 },
        { stage: STAGE.score, at: 3000 },
        { stage: STAGE.verdict, at: 3650 },
        { stage: STAGE.done, at: 4150 },
      ]
    : [
        { stage: STAGE.fly, at: 350 },
        { stage: STAGE.answer, at: 1500 },
        { stage: STAGE.distance, at: 1900 },
        { stage: STAGE.score, at: 2300 },
        { stage: STAGE.verdict, at: 2850 },
        { stage: STAGE.done, at: 3350 },
      ];
}
