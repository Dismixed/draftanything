export const TIERS = ["S", "A", "B", "C", "D"] as const;
export type Tier = (typeof TIERS)[number];

/** Percent of players who put an item in each tier. */
export type TierDistribution = Record<Tier, number>;

export interface Take<Item> {
  item: Item;
  tier: Tier;
  dist: TierDistribution;
  /** Percent of players who agree with this placement. */
  agree: number;
}

/** A take counts as hot when fewer than this percent of players agree with it. */
const HOT_BELOW = 50;

/**
 * Every placement, hottest first (fewest players agreeing; item order breaks ties), plus the
 * three hottest. `withCrowd` is true when none of those three is actually hot.
 */
export function rankTakes<Item extends { id: string }>(
  items: readonly Item[],
  placements: Readonly<Record<string, Tier>>,
  consensus: Readonly<Record<string, TierDistribution>>,
): { rows: Take<Item>[]; hottest: Take<Item>[]; withCrowd: boolean } {
  const rows = items
    .map((item) => {
      const tier = placements[item.id]!;
      const dist = consensus[item.id]!;
      return { item, tier, dist, agree: dist[tier] };
    })
    // Array.prototype.sort is stable, so equal agreement keeps item order.
    .sort((a, b) => a.agree - b.agree);
  const hottest = rows.slice(0, 3);
  return { rows, hottest, withCrowd: !hottest.some((take) => take.agree < HOT_BELOW) };
}
