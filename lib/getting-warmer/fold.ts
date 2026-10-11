/** Up to this many clues, a wide screen shows every clue as its own row. */
export const ROWS_UP_TO = 6;
/** Earlier clues kept in view once they fold into tags. A phone always shows tags, and fewer of them. */
export const WIDE_TAG_CAP = 9;
export const NARROW_TAG_CAP = 6;
/** Wrong guesses kept in view under the answer box. */
export const MISS_CAP = 4;

export interface ClueFold {
  /** Whether a wide screen has switched from rows to tags. */
  folded: boolean;
  /** How many of the oldest clues are tucked behind "+N earlier" on a wide screen. */
  hiddenWide: number;
  /** The same for a phone. */
  hiddenNarrow: number;
}

/**
 * The game never runs out of hints, so the clue list has to stay a bounded size. The newest clue
 * is always shown large; this decides what happens to the ones before it.
 */
export function foldClues(clueCount: number): ClueFold {
  const earlier = Math.max(0, clueCount - 1);
  const folded = clueCount > ROWS_UP_TO;
  return {
    folded,
    hiddenWide: folded ? Math.max(0, earlier - WIDE_TAG_CAP) : 0,
    hiddenNarrow: Math.max(0, earlier - NARROW_TAG_CAP),
  };
}

/** How many of the oldest wrong guesses are tucked behind "+N". */
export function hiddenMisses(missCount: number): number {
  return Math.max(0, missCount - MISS_CAP);
}
