import type { JudgingMode } from "../draft/types";
import { compareFixed, fixedEqual } from "./fixed-point";

export interface Vote {
  voterPlayerId: string;
  selectedPlayerId: string;
}

export type PlayerScores = Record<string, number>;

export type TieBreakInput =
  | { mode: Exclude<JudgingMode, "hybrid"> }
  | {
      mode: "hybrid";
      aiScores: PlayerScores;
      aggregateMetadata: PlayerScores;
    };

const assertSamePlayerKeys = (
  left: PlayerScores,
  right: PlayerScores,
): void => {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();

  if (
    leftKeys.length !== rightKeys.length ||
    leftKeys.some((key, index) => key !== rightKeys[index])
  ) {
    throw new Error("inputs must contain the same player keys");
  }
};

const assertScoreMap = (scores: PlayerScores, name: string): void => {
  for (const score of Object.values(scores)) {
    if (!Number.isFinite(score) || score < 0 || score > 10) {
      throw new RangeError(`${name} must contain finite scores from 0 to 10`);
    }
  }
};

export const normalizeAiScore = (score: number): number => {
  if (!Number.isFinite(score) || score < 0 || score > 10) {
    throw new RangeError("AI score must be a finite number from 0 to 10");
  }
  return score;
};

/** Map arbitrary roster totals onto the 0..10 judging scale (preserves rank order). */
export const scaleToJudgingRange = (scores: PlayerScores): PlayerScores => {
  const entries = Object.entries(scores);
  if (entries.length === 0) {
    return scores;
  }

  const values = entries.map(([, score]) => score);
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (!values.every((score) => Number.isFinite(score))) {
    throw new RangeError("scores must be finite numbers");
  }

  if (max === min) {
    return Object.fromEntries(entries.map(([playerId]) => [playerId, 10]));
  }

  return Object.fromEntries(
    entries.map(([playerId, score]) => [
      playerId,
      ((score - min) / (max - min)) * 10,
    ]),
  );
};

export const communityVoteShares = (
  playerIds: readonly string[],
  votes: readonly Vote[],
): PlayerScores => {
  const players = new Set(playerIds);
  if (players.size !== playerIds.length) {
    throw new Error("player IDs must be unique");
  }

  const counts = Object.fromEntries(playerIds.map((playerId) => [playerId, 0]));
  const voters = new Set<string>();

  for (const vote of votes) {
    if (!players.has(vote.voterPlayerId)) {
      throw new Error(`voter is not a player: ${vote.voterPlayerId}`);
    }
    if (!players.has(vote.selectedPlayerId)) {
      throw new Error(`selected ID is not a player: ${vote.selectedPlayerId}`);
    }
    if (vote.voterPlayerId === vote.selectedPlayerId) {
      throw new Error("self-votes are not allowed");
    }
    if (voters.has(vote.voterPlayerId)) {
      throw new Error(`duplicate voter: ${vote.voterPlayerId}`);
    }

    voters.add(vote.voterPlayerId);
    counts[vote.selectedPlayerId] += 1;
  }

  if (votes.length === 0) {
    return counts;
  }

  return Object.fromEntries(
    playerIds.map((playerId) => [
      playerId,
      (counts[playerId] / votes.length) * 10,
    ]),
  );
};

export const hybridScores = (
  aiScores: PlayerScores,
  communityScores: PlayerScores,
): PlayerScores => {
  assertSamePlayerKeys(aiScores, communityScores);

  return Object.fromEntries(
    Object.keys(aiScores).map((playerId) => [
      playerId,
      normalizeAiScore(aiScores[playerId]) * 0.7 +
        normalizeAiScore(communityScores[playerId]) * 0.3,
    ]),
  );
};

export const resolveWinners = (
  scores: PlayerScores,
  tieBreak: TieBreakInput,
): string[] => {
  const playerIds = Object.keys(scores);
  if (playerIds.length === 0) {
    throw new Error("scores must contain at least one player");
  }
  assertScoreMap(scores, "scores");

  if (tieBreak.mode === "hybrid") {
    assertSamePlayerKeys(scores, tieBreak.aiScores);
    assertSamePlayerKeys(scores, tieBreak.aggregateMetadata);
    assertScoreMap(tieBreak.aiScores, "AI scores");
    assertScoreMap(tieBreak.aggregateMetadata, "aggregate metadata");
  }

  const topScore = Object.values(scores).reduce((top, score) =>
    compareFixed(score, top) > 0 ? score : top,
  );
  let winners = playerIds.filter((playerId) =>
    fixedEqual(scores[playerId], topScore),
  );

  if (tieBreak.mode !== "hybrid" || winners.length === 1) {
    return winners;
  }

  const topAi = winners
    .map((playerId) => tieBreak.aiScores[playerId])
    .reduce((top, score) => (compareFixed(score, top) > 0 ? score : top));
  winners = winners.filter((playerId) =>
    fixedEqual(tieBreak.aiScores[playerId], topAi),
  );

  const topMetadata = winners
    .map((playerId) => tieBreak.aggregateMetadata[playerId])
    .reduce((top, score) => (compareFixed(score, top) > 0 ? score : top));
  return winners.filter((playerId) =>
    fixedEqual(tieBreak.aggregateMetadata[playerId], topMetadata),
  );
};
