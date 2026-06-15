import { normalizeItemName } from "../pool/normalize";

export interface RubricCategory {
  key: string;
  weight: number;
}

export type ItemMetadata = Record<string, number>;

export interface DraftItem {
  id: string;
  name: string;
  available: boolean;
  metadata: ItemMetadata;
}

export interface RosterPick {
  pickId: string;
  playerId: string;
  itemId: string;
  itemName: string;
  metadata: ItemMetadata;
  overallPick: number;
}

export interface AwardReference {
  pickId: string;
  itemId: string;
  playerId: string;
}

export interface DraftAwards {
  bestPick: AwardReference;
  worstPick: AwardReference;
  biggestSteal: AwardReference;
}

export interface FallbackJudgment {
  rosterScores: Record<string, number>;
  winnerIds: string[];
  awards: DraftAwards;
}

const validateRubric = (rubric: readonly RubricCategory[]): void => {
  const keys = new Set<string>();
  let total = 0;

  for (const category of rubric) {
    if (
      category.key.length === 0 ||
      !Number.isFinite(category.weight) ||
      category.weight < 0 ||
      keys.has(category.key)
    ) {
      throw new Error("rubric keys must be unique and weights nonnegative");
    }
    keys.add(category.key);
    total += category.weight;
  }

  if (total !== 100) {
    throw new Error("rubric weights must sum to 100");
  }
};

const compareNamesAndIds = (
  left: { name: string; id: string },
  right: { name: string; id: string },
): number => {
  const leftName = normalizeItemName(left.name);
  const rightName = normalizeItemName(right.name);

  if (leftName !== rightName) {
    return leftName < rightName ? -1 : 1;
  }
  if (left.id === right.id) {
    return 0;
  }
  return left.id < right.id ? -1 : 1;
};

export const weightedItemScore = (
  metadata: ItemMetadata,
  rubric: readonly RubricCategory[],
): number => {
  validateRubric(rubric);

  return rubric.reduce((score, category) => {
    const value = metadata[category.key];
    if (!Number.isFinite(value) || value < 0 || value > 10) {
      throw new Error(
        `metadata must include a finite 0..10 value for ${category.key}`,
      );
    }
    return score + value * (category.weight / 100);
  }, 0);
};

export const selectAutoPick = (
  items: readonly DraftItem[],
  rubric: readonly RubricCategory[],
): DraftItem => {
  const available = items.filter((item) => item.available);
  if (available.length === 0) {
    throw new Error("at least one available item is required");
  }

  return [...available].sort((left, right) => {
    const scoreDifference =
      weightedItemScore(right.metadata, rubric) -
      weightedItemScore(left.metadata, rubric);
    return (
      scoreDifference ||
      compareNamesAndIds(
        { name: left.name, id: left.id },
        { name: right.name, id: right.id },
      )
    );
  })[0];
};

export const rosterScore = (
  picks: readonly RosterPick[],
  rubric: readonly RubricCategory[],
): number => {
  if (picks.length === 0) {
    throw new Error("roster must contain at least one pick");
  }

  const total = picks.reduce(
    (score, pick) => score + weightedItemScore(pick.metadata, rubric),
    0,
  );
  return total / picks.length;
};

const awardReference = (pick: RosterPick): AwardReference => ({
  pickId: pick.pickId,
  itemId: pick.itemId,
  playerId: pick.playerId,
});

const comparePickNamesAndIds = (
  left: RosterPick,
  right: RosterPick,
): number =>
  compareNamesAndIds(
    { name: left.itemName, id: left.itemId },
    { name: right.itemName, id: right.itemId },
  );

export const deriveAwards = (
  picks: readonly RosterPick[],
  rubric: readonly RubricCategory[],
): DraftAwards => {
  if (picks.length === 0) {
    throw new Error("at least one pick is required for awards");
  }

  const scored = picks.map((pick) => ({
    pick,
    score: weightedItemScore(pick.metadata, rubric),
  }));
  const finalPick = Math.max(...picks.map(({ overallPick }) => overallPick));

  const byHighestScore = [...scored].sort(
    (left, right) =>
      right.score - left.score ||
      comparePickNamesAndIds(left.pick, right.pick),
  );
  const byLowestScore = [...scored].sort(
    (left, right) =>
      left.score - right.score ||
      comparePickNamesAndIds(left.pick, right.pick),
  );
  const bySteal = [...scored].sort((left, right) => {
    const expected = (overallPick: number): number =>
      finalPick === 1 ? 10 : (10 * (finalPick - overallPick)) / (finalPick - 1);
    const leftSteal = left.score - expected(left.pick.overallPick);
    const rightSteal = right.score - expected(right.pick.overallPick);
    return (
      rightSteal - leftSteal ||
      comparePickNamesAndIds(left.pick, right.pick)
    );
  });

  return {
    bestPick: awardReference(byHighestScore[0].pick),
    worstPick: awardReference(byLowestScore[0].pick),
    biggestSteal: awardReference(bySteal[0].pick),
  };
};

export const fallbackJudge = (
  playerIds: readonly string[],
  picks: readonly RosterPick[],
  rubric: readonly RubricCategory[],
): FallbackJudgment => {
  if (new Set(playerIds).size !== playerIds.length || playerIds.length === 0) {
    throw new Error("player IDs must be nonempty and unique");
  }

  const players = new Set(playerIds);
  if (picks.some((pick) => !players.has(pick.playerId))) {
    throw new Error("every pick must belong to a player");
  }

  const rosterScores = Object.fromEntries(
    playerIds.map((playerId) => [
      playerId,
      rosterScore(
        picks.filter((pick) => pick.playerId === playerId),
        rubric,
      ),
    ]),
  );
  const topScore = Math.max(...Object.values(rosterScores));

  return {
    rosterScores,
    winnerIds: playerIds.filter((playerId) => rosterScores[playerId] === topScore),
    awards: deriveAwards(picks, rubric),
  };
};
