import { seededRandom, type RandomSource } from "@/features/draft/order";
import type { BotStyle } from "./roster";

export interface ScoredItem {
  id: string;
  name: string;
  /** Per-category scores from pool generation. Empty for hand-added items. */
  scores: Record<string, number>;
}

export interface PoolPickInput {
  style: BotStyle;
  /** Items still on the board. Must not be empty. */
  available: ScoredItem[];
  /** Rubric category key to weight. May be empty. */
  rubric: Record<string, number>;
  ownLineup: ScoredItem[];
  /** The category a Specialist favours in this draft. */
  specialistKey: string | null;
  random: RandomSource;
}

const SPECIALIST_BOOST = 3;
const HIPSTER_SKIP = 3;

/**
 * Weighted mean of an item's scores. Categories the item has no score for are
 * left out rather than counted as zero. NaN when the item has no scores.
 */
export function compositeScore(
  scores: Record<string, number>,
  rubric: Record<string, number>,
): number {
  const rubricKeys = Object.keys(rubric);
  const keys = rubricKeys.length > 0 ? rubricKeys : Object.keys(scores);

  let total = 0;
  let weightSum = 0;
  for (const key of keys) {
    const value = scores[key];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    const weight = rubricKeys.length > 0 ? rubric[key] : 1;
    if (!Number.isFinite(weight) || weight <= 0) continue;
    total += value * weight;
    weightSum += weight;
  }

  return weightSum > 0 ? total / weightSum : Number.NaN;
}

/** The rubric category a Specialist in this seat favours for the whole draft. */
export function specialistCategory(
  rubric: Record<string, number>,
  draftId: string,
  seat: number,
): string | null {
  const keys = Object.keys(rubric).sort();
  if (keys.length === 0) return null;
  const index = Math.floor(seededRandom(`${draftId}:${seat}`)() * keys.length);
  return keys[Math.min(index, keys.length - 1)];
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Best first. Items with no scores sit at the median of those that have them. */
function rank(
  items: ScoredItem[],
  rubric: Record<string, number>,
): Array<{ item: ScoredItem; score: number }> {
  const raw = items.map((item) => ({ item, score: compositeScore(item.scores, rubric) }));
  const fallback = median(raw.map((r) => r.score).filter((s) => !Number.isNaN(s)));

  return raw
    .map((r) => ({ item: r.item, score: Number.isNaN(r.score) ? fallback : r.score }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.item.name.localeCompare(b.item.name) ||
        a.item.id.localeCompare(b.item.id),
    );
}

function weakestCategory(
  lineup: ScoredItem[],
  rubric: Record<string, number>,
): string | null {
  let weakest: string | null = null;
  let lowest = Number.POSITIVE_INFINITY;

  for (const key of Object.keys(rubric).sort()) {
    const values = lineup
      .map((item) => item.scores[key])
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (values.length === 0) continue;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    if (mean < lowest) {
      lowest = mean;
      weakest = key;
    }
  }

  return weakest;
}

/** Chooses the item an AI drafter of this style takes from the pool. */
export function pickFromPool(input: PoolPickInput): ScoredItem {
  const { style, available, rubric, ownLineup, specialistKey, random } = input;
  if (available.length === 0) {
    throw new RangeError("pickFromPool needs at least one available item");
  }

  const ranked = rank(available, rubric);

  switch (style) {
    case "hipster":
      return (ranked.length > HIPSTER_SKIP ? ranked[HIPSTER_SKIP] : ranked[0]).item;

    case "wildcard": {
      const topHalf = Math.ceil(ranked.length / 2);
      const index = Math.min(Math.floor(random() * topHalf), topHalf - 1);
      return ranked[Math.max(0, index)].item;
    }

    case "specialist": {
      if (!specialistKey || !(specialistKey in rubric)) return ranked[0].item;
      const boosted = {
        ...rubric,
        [specialistKey]: rubric[specialistKey] * SPECIALIST_BOOST,
      };
      return rank(available, boosted)[0].item;
    }

    case "balancer": {
      const weakKey = weakestCategory(ownLineup, rubric);
      if (!weakKey) return ranked[0].item;
      return [...ranked].sort((a, b) => {
        const left = a.item.scores[weakKey] ?? a.score;
        const right = b.item.scores[weakKey] ?? b.score;
        return right - left || b.score - a.score;
      })[0].item;
    }

    case "chalk":
    default:
      return ranked[0].item;
  }
}
