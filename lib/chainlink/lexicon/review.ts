/**
 * Editorial corrections to the gated lexicon, keyed by "first second". Kept
 * in data/chainlink/lexicon-review.json so a rebuild reapplies them.
 */
export type ReviewDecision =
  | { action: "remove"; reason: string }
  | { action: "rescore"; familiarity: number };

export type Review = Record<string, ReviewDecision>;

export function applyReview<T extends { word_a: string; word_b: string; familiarity: number }>(
  links: readonly T[],
  review: Review,
): T[] {
  const kept: T[] = [];
  for (const link of links) {
    const decision = review[`${link.word_a} ${link.word_b}`];
    if (decision?.action === "remove") continue;
    kept.push(decision ? { ...link, familiarity: decision.familiarity } : link);
  }
  return kept;
}
