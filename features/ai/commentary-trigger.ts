export interface CommentaryTriggerInput {
  pickedItemScores: Record<string, number>;
  allItemScores: Array<Record<string, number>>;
  overallPick: number;
  totalPicks: number;
  rubricWeights: Record<string, number>;
  recentPickScores: Array<{ scores: Record<string, number>; seat: number }>;
  seatPickScores: Array<Record<string, number>>;
  picksSinceLastCommentary: number;
}

export interface CommentaryTriggerResult {
  tags: string[];
  priority: number;
}

export type CommentaryTag =
  | "reach"
  | "steal"
  | "run"
  | "trend"
  | "surprise"
  | "solid"
  | "roundup"
  | "opening";

/** Minimum picks between commentary lines (1 = every pick can comment). */
export const MIN_PICKS_BETWEEN_COMMENTARY = 1;

/** Fallback commentary when no notable trigger fires for this many picks. */
export const ROUNDUP_PICK_INTERVAL = 1;

const TAG_PRIORITY: Record<CommentaryTag, number> = {
  steal: 10,
  surprise: 9,
  reach: 8,
  opening: 7,
  run: 5,
  trend: 5,
  solid: 4,
  roundup: 3,
};

function computeCompositeScore(
  scores: Record<string, number>,
  weights: Record<string, number>,
): number {
  let total = 0;
  let weightSum = 0;
  for (const [key, value] of Object.entries(scores)) {
    const weight = weights[key] ?? 1;
    total += value * weight;
    weightSum += weight;
  }
  return weightSum > 0 ? total / weightSum : 0;
}

function findHighestCategory(
  scores: Record<string, number>,
): string | null {
  let maxKey: string | null = null;
  let maxValue = -Infinity;
  for (const [key, value] of Object.entries(scores)) {
    if (value > maxValue) {
      maxValue = value;
      maxKey = key;
    } else if (value === maxValue) {
      maxKey = null;
    }
  }
  return maxKey;
}

function isBottomQuartile(
  score: number,
  allScores: number[],
): boolean {
  if (allScores.length === 0) return false;
  const sorted = [...allScores].sort((a, b) => a - b);
  const cutoffIndex = Math.floor(sorted.length * 0.25);
  return score <= sorted[cutoffIndex];
}

function isTopQuartile(
  score: number,
  allScores: number[],
): boolean {
  if (allScores.length === 0) return false;
  const sorted = [...allScores].sort((a, b) => a - b);
  const cutoffIndex = Math.ceil(sorted.length * 0.75) - 1;
  return score >= sorted[Math.max(0, cutoffIndex)];
}

function isAboveMedian(score: number, allScores: number[]): boolean {
  if (allScores.length === 0) return false;
  const sorted = [...allScores].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return score >= median;
}

export function evaluateCommentaryTrigger(
  input: CommentaryTriggerInput,
): CommentaryTriggerResult | null {
  if (input.picksSinceLastCommentary < MIN_PICKS_BETWEEN_COMMENTARY) return null;

  if (Object.keys(input.pickedItemScores).length === 0) return null;

  const tags: CommentaryTag[] = [];
  const allCompositeScores = input.allItemScores.map((s) =>
    computeCompositeScore(s, input.rubricWeights),
  );
  const pickedCompositeScore = computeCompositeScore(
    input.pickedItemScores,
    input.rubricWeights,
  );
  const pickedCategory = findHighestCategory(input.pickedItemScores);

  if (isBottomQuartile(pickedCompositeScore, allCompositeScores)) {
    tags.push("reach");
  }

  if (isTopQuartile(pickedCompositeScore, allCompositeScores)) {
    const medianPick = input.totalPicks / 2;
    const earlyCutoff = Math.max(1, Math.ceil(input.totalPicks / 3));
    if (input.overallPick > medianPick) {
      tags.push("steal");
    } else if (input.overallPick <= earlyCutoff) {
      tags.push("surprise");
    }
  }

  if (pickedCategory !== null) {
    if (input.recentPickScores.length >= 1) {
      const allPicks = [
        ...input.recentPickScores.map((p) => p.scores),
        input.pickedItemScores,
      ];
      const categories = allPicks.map((s) => findHighestCategory(s));
      if (categories.length >= 2 && categories.every((c) => c === pickedCategory)) {
        tags.push("run");
      }
    }

    if (input.seatPickScores.length >= 1) {
      const allSeatPicks = [...input.seatPickScores, input.pickedItemScores];
      const seatCategories = allSeatPicks.map((s) => findHighestCategory(s));
      if (seatCategories.length >= 2 && seatCategories.every((c) => c === pickedCategory)) {
        tags.push("trend");
      }
    }
  }

  if (input.overallPick === 1) {
    tags.push("opening");
  }

  if (
    tags.length === 0 &&
    isAboveMedian(pickedCompositeScore, allCompositeScores)
  ) {
    tags.push("solid");
  }

  if (
    tags.length === 0 &&
    input.picksSinceLastCommentary >= ROUNDUP_PICK_INTERVAL
  ) {
    tags.push("roundup");
  }

  if (tags.length === 0) return null;

  const priority = Math.max(...tags.map((t) => TAG_PRIORITY[t]));

  return { tags, priority };
}
