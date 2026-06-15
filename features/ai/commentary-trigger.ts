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

export type CommentaryTag = "reach" | "steal" | "run" | "trend" | "surprise";

const TAG_PRIORITY: Record<CommentaryTag, number> = {
  steal: 10,
  reach: 8,
  run: 5,
  trend: 5,
  surprise: 3,
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

export function evaluateCommentaryTrigger(
  input: CommentaryTriggerInput,
): CommentaryTriggerResult | null {
  if (input.picksSinceLastCommentary < 2) return null;

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
    if (input.overallPick > medianPick) {
      tags.push("steal");
    }
  }

  if (pickedCategory !== null) {
    if (input.recentPickScores.length >= 2) {
      const allPicks = [
        ...input.recentPickScores.map((p) => p.scores),
        input.pickedItemScores,
      ];
      const categories = allPicks.map((s) => findHighestCategory(s));
      if (categories.length >= 3 && categories.every((c) => c === pickedCategory)) {
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

  if (tags.length === 0) return null;

  const priority = Math.max(...tags.map((t) => TAG_PRIORITY[t]));

  return { tags, priority };
}
