export interface ScorableLink {
  /** The gate's 1–5 rating of how widely the phrase is known. */
  familiarity: number;
  /** Corpus occurrences. */
  count: number;
}

/** Lowest score in each familiarity level's three-point band. */
const BAND_FLOOR: Record<number, number> = { 5: 8, 4: 5, 3: 2 };

/**
 * Maps links onto the 1–10 `commonness_score` scale. Familiarity picks the
 * band (5 → 8–10, 4 → 5–7, 3 or lower → 2–4) and corpus count ranks a phrase
 * within its band, in thirds. Equal counts share a score.
 *
 * Familiarity leads because the counts come from web text, which rates
 * "chip set" far above "chicken soup".
 */
export function scoreLinks(links: readonly ScorableLink[]): number[] {
  const level = (link: ScorableLink) => Math.min(5, Math.max(3, link.familiarity));

  const countsByLevel = new Map<number, number[]>();
  for (const link of links) {
    const counts = countsByLevel.get(level(link)) ?? [];
    counts.push(link.count);
    countsByLevel.set(level(link), counts);
  }

  const firstIndexByLevel = new Map<number, Map<number, number>>();
  for (const [key, counts] of countsByLevel) {
    const firstIndex = new Map<number, number>();
    counts
      .sort((a, b) => a - b)
      .forEach((count, index) => {
        if (!firstIndex.has(count)) firstIndex.set(count, index);
      });
    firstIndexByLevel.set(key, firstIndex);
  }

  return links.map((link) => {
    const key = level(link);
    const index = firstIndexByLevel.get(key)!.get(link.count)!;
    return BAND_FLOOR[key] + Math.floor((3 * index) / countsByLevel.get(key)!.length);
  });
}
