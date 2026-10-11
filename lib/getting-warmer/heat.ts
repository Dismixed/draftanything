import { INITIAL_CLUES } from "./game-logic";

export const HEAT_LABELS = ["Cold", "Lukewarm", "Warm", "Hot", "On fire"] as const;

export interface HeatReading {
  /** Index into HEAT_LABELS. The last one is only reached by solving. */
  level: number;
  label: (typeof HEAT_LABELS)[number];
  /** How full the thermometer is, 0 to 1. Only a solve reaches 1. */
  fraction: number;
  /** Hints revealed beyond the puzzle's written clues. */
  bonus: number;
}

const HOT_LEVEL = HEAT_LABELS.length - 2;
const HOT_FRACTION = 0.83;
const FIRST_STEP = 0.08;
/** The room left above HOT that extra hints creep into without ever filling. */
const BONUS_ROOM = 0.13;

/**
 * The temperature for a given number of revealed clues. It climbs from Cold to Hot across the
 * puzzle's written clues, however many there are. The game never runs out of hints, so every
 * hint after that still nudges the mercury up, by less each time.
 */
export function heatReading(clueCount: number, authoredCount: number, solved: boolean): HeatReading {
  if (solved) {
    const level = HEAT_LABELS.length - 1;
    return { level, label: HEAT_LABELS[level], fraction: 1, bonus: 0 };
  }

  const span = authoredCount - INITIAL_CLUES;
  const revealed = Math.min(clueCount, authoredCount) - INITIAL_CLUES;
  const progress = span > 0 ? Math.min(1, Math.max(0, revealed / span)) : clueCount > INITIAL_CLUES ? 1 : 0;
  const bonus = Math.max(0, clueCount - Math.max(authoredCount, INITIAL_CLUES));

  const level = Math.round(progress * HOT_LEVEL);
  const base = progress > 0 ? FIRST_STEP + progress * (HOT_FRACTION - FIRST_STEP) : 0;
  const fraction = base + BONUS_ROOM * (1 - Math.pow(0.6, bonus));

  return { level, label: HEAT_LABELS[level], fraction, bonus };
}
