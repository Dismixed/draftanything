export interface IslesElements {
  /** "N days at sea", kept current while sailing. */
  odo: HTMLElement;
  /** Where the ship is: an island's name, or "at sea · night". */
  where: HTMLElement;
  /** A full-screen layer flashed in the tier's colour on a great reckoning. */
  flash: HTMLElement;
}

export interface IslesHooks {
  /** Days each tier's crossing takes, best tier first, Becalmed last. */
  days?: readonly number[];
  /** The ship has arrived; says how close it got ("anchored just offshore"). */
  onLanded?: (text: string) => void;
}

export interface IslesHandle {
  /** The islands of this voyage, home port first, then the seven, then the treasure island. */
  names: () => string[];
  /**
   * Picks up a voyage part-way, given the tier of each crossing so far. An eighth tier is the
   * treasure island's, with `saved` the days it took off; `unlocked` shows the treasure island.
   */
  place: (tiers: number[], saved?: number, unlocked?: boolean) => void;
  /** The voyage came in under par: the treasure island appears. */
  unlock: () => void;
  /** The treasure guess lands with this tier, taking `saved` days off. */
  landTreasure: (tier: number, saved: number) => void;
  intro: () => void;
  ask: () => void;
  reveal: () => void;
  land: (tier: number) => void;
  /** The sailor boards, then the ship crosses; `arrived` runs once it is ashore at the next island. */
  sail: (arrived: () => void) => void;
  end: () => void;
  destroy: () => void;
}

/** `seed` picks the day's islands and their layout, so everyone sails the same sea. */
export function createIsles(canvas: HTMLCanvasElement, root: HTMLElement, els: IslesElements, seed: string, hooks?: IslesHooks): IslesHandle;
