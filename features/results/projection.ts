import "server-only";

import type { DraftRoomProjection } from "@/features/draft/types";

export interface PublicPlayerResult {
  id: string;
  displayName: string;
  score: number | null;
  rank: number | null;
}

export interface PublicAward {
  type: "bestPick" | "worstPick" | "biggestSteal";
  playerName: string;
  itemName: string;
  pickNumber: number;
}

export interface PublicDraftResult {
  topic: string;
  rounds: number;
  draftType: string;
  judgingMode: string;
  completedAt: string;
  winner: PublicPlayerResult | null;
  ranking: PublicPlayerResult[];
  awards: PublicAward[];
  explanation: string | null;
  communityTotals: Record<string, number>;
}

function resolvePlayerName(
  playerId: string,
  players: DraftRoomProjection["players"],
): string {
  return players.find((p) => p.id === playerId)?.displayName ?? "Unknown";
}

function resolveItemName(
  itemId: string,
  picks: DraftRoomProjection["picks"],
  items: DraftRoomProjection["availableItems"],
): string {
  const pick = picks.find((p) => p.itemId === itemId);
  if (pick) {
    const item = items.find((i) => i.id === pick.itemId);
    if (item) return item.name;
  }
  const item = items.find((i) => i.id === itemId);
  return item?.name ?? "Unknown";
}

export function buildPublicResult(
  projection: DraftRoomProjection,
): PublicDraftResult {
  const { draft, players, picks, judgment, votes, availableItems } = projection;

  const completedAt = draft.phase === "COMPLETE" ? new Date().toISOString() : "";

  const playerScoreMap: Record<string, number> = {};
  const playerRankMap: Record<string, number> = {};

  if (judgment) {
    for (const [playerId, score] of Object.entries(judgment.playerScores)) {
      playerScoreMap[playerId] = score;
    }
    judgment.ranking.forEach((playerId, index) => {
      playerRankMap[playerId] = index + 1;
    });
  }

  const ranking: PublicPlayerResult[] = players.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    score: playerScoreMap[p.id] ?? null,
    rank: playerRankMap[p.id] ?? null,
  }));

  if (judgment) {
    ranking.sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
  }

  const winner: PublicPlayerResult | null =
    judgment && judgment.winnerPlayerIds.length > 0
      ? {
          id: judgment.winnerPlayerIds[0],
          displayName: resolvePlayerName(judgment.winnerPlayerIds[0], players),
          score: playerScoreMap[judgment.winnerPlayerIds[0]] ?? null,
          rank: 1,
        }
      : null;

  const rawAwards = judgment?.awards ?? {};
  const awards: PublicAward[] = [];

  for (const awardType of ["bestPick", "worstPick", "biggestSteal"] as const) {
    const award = rawAwards[awardType] as
      | { pickId?: string; itemId?: string; playerId?: string }
      | undefined;
    if (award) {
      awards.push({
        type: awardType,
        playerName: award.playerId
          ? resolvePlayerName(award.playerId, players)
          : "Unknown",
        itemName: award.itemId
          ? resolveItemName(award.itemId, picks, availableItems)
          : "Unknown",
        pickNumber: award.pickId
          ? picks.find((p) => p.id === award.pickId)?.overallPick ?? 0
          : 0,
      });
    }
  }

  const communityTotals: Record<string, number> = {};
  for (const vote of votes) {
    communityTotals[vote.selectedPlayerId] =
      (communityTotals[vote.selectedPlayerId] ?? 0) + 1;
  }

  return {
    topic: draft.topic,
    rounds: draft.rounds,
    draftType: draft.draftType,
    judgingMode: draft.judgingMode,
    completedAt,
    winner,
    ranking,
    awards,
    explanation: judgment?.explanation ?? null,
    communityTotals,
  };
}
