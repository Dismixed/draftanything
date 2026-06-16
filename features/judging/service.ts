import "server-only";

import { AppError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  communityVoteShares,
  hybridScores,
  normalizeAiScore,
  resolveWinners,
} from "./hybrid";
import { judgeRosters } from "@/features/ai/judge";
import type { JudgeInput } from "@/features/ai/judge";
import type { RubricCategory, RosterPick } from "@/features/ai/fallback";
import type { SafePick, SafePlayer } from "@/features/draft/types";

export interface Vote {
  voterPlayerId: string;
  selectedPlayerId: string;
}

export interface DefenseArg {
  playerId: string;
  defenseText: string | null;
  skipped: boolean;
}

export interface AwardRef {
  pickId: string;
  itemId: string;
  playerId: string;
}

export interface JudgmentRecord {
  draftId: string;
  source: "ai" | "fallback";
  playerScores: Record<string, { overall: number; categories: Record<string, number> }>;
  ranking: string[];
  winnerPlayerIds: string[];
  awards: { bestPick: AwardRef; worstPick: AwardRef; biggestSteal: AwardRef };
  explanation: string;
  model: string | null;
  promptVersion: string;
  idempotencyKey: string;
}

export interface RosterInfo {
  pickIds: string[];
  playerId: string;
  itemIds: string[];
  displayName: string;
}

export async function persistJudgment(judgment: JudgmentRecord): Promise<void> {
  const db = createAdminClient();

  const { error } = await db.from("judgments").insert({
    draft_id: judgment.draftId,
    source: judgment.source,
    player_scores: JSON.stringify(
      Object.fromEntries(
        Object.entries(judgment.playerScores).map(([pid, s]) => [pid, s.overall]),
      ),
    ) as unknown as Record<string, number>,
    ranking: JSON.stringify(judgment.ranking),
    winner_player_ids: JSON.stringify(judgment.winnerPlayerIds),
    awards: JSON.stringify(judgment.awards),
    explanation: judgment.explanation,
    model: judgment.model,
    prompt_version: judgment.promptVersion,
    idempotency_key: judgment.idempotencyKey,
  });

  if (error) {
    throw new Error(`Failed to persist judgment: ${error.message}`);
  }
}

export async function judgeDraft(
  draftId: string,
  topic: string,
  judgingMode: "ai" | "community" | "hybrid",
  personality: string,
  rubric: RubricCategory[],
  players: SafePlayer[],
  picks: SafePick[],
  rosters: RosterInfo[],
  voteRecords: Vote[],
): Promise<JudgmentRecord> {
  if (judgingMode === "ai") {
    return await judgeAiMode(draftId, topic, personality, rubric, players, picks, rosters);
  }

  if (judgingMode === "community") {
    return judgeCommunityMode(draftId, players, picks, voteRecords);
  }

  return await judgeHybridMode(
    draftId,
    topic,
    personality,
    rubric,
    players,
    picks,
    rosters,
    voteRecords,
  );
}

export interface JudgingData {
  hostGuestId: string;
  phase: string;
  topic: string;
  judgingMode: "ai" | "community" | "hybrid";
  aiPersonality: string;
  rubric: RubricCategory[];
  safePlayers: SafePlayer[];
  safePicks: SafePick[];
  rosters: RosterInfo[];
  voteRecords: Vote[];
}

export async function getJudgingData(draftId: string): Promise<JudgingData> {
  const db = createAdminClient();

  const { data: draft, error: draftError } = await db
    .from("drafts")
    .select("*")
    .eq("id", draftId)
    .single();

  if (draftError || !draft) {
    throw new AppError("ROOM_NOT_FOUND", "Draft not found");
  }

  const { data: players } = await db
    .from("draft_players")
    .select("id, guest_id, display_name, seat")
    .eq("draft_id", draftId)
    .is("removed_at", null);

  if (!players || players.length === 0) {
    throw new Error("No players found");
  }

  const { data: picks } = await db
    .from("picks")
    .select("id, player_id, item_id, overall_pick")
    .eq("draft_id", draftId)
    .order("overall_pick", { ascending: true });

  const { data: votes } = await db
    .from("votes")
    .select("voter_player_id, selected_player_id")
    .eq("draft_id", draftId);

  const voteRecords: Vote[] = (votes ?? []).map((v) => ({
    voterPlayerId: v.voter_player_id as string,
    selectedPlayerId: v.selected_player_id as string,
  }));

  const safePlayers: SafePlayer[] = players.map((p) => ({
    id: p.id as string,
    displayName: p.display_name as string,
    seat: p.seat as number,
    isReady: false,
    isHost: (p.guest_id as string) === (draft.host_guest_id as string),
  }));

  const safePicks: SafePick[] = (picks ?? []).map((p) => ({
    id: p.id as string,
    playerId: p.player_id as string,
    itemId: p.item_id as string,
    overallPick: p.overall_pick as number,
    round: 1,
    pickInRound: 1,
    isAutoPick: false,
  }));

  const rosters: RosterInfo[] = players.map((p) => {
    const playerPicks = (picks ?? []).filter(
      (pick) => (pick.player_id as string) === (p.id as string),
    );
    return {
      pickIds: playerPicks.map((pick) => pick.id as string),
      playerId: p.id as string,
      itemIds: playerPicks.map((pick) => pick.item_id as string),
      displayName: p.display_name as string,
    };
  });

  const rubricRaw = draft.rubric as Record<string, number> | null;
  const rubric: RubricCategory[] = rubricRaw
    ? Object.entries(rubricRaw).map(([key, weight]) => ({ key, weight }))
    : [];

  return {
    hostGuestId: draft.host_guest_id as string,
    phase: draft.phase as string,
    topic: draft.topic as string,
    judgingMode: draft.judging_mode as "ai" | "community" | "hybrid",
    aiPersonality: (draft.ai_personality as string) ?? "",
    rubric,
    safePlayers,
    safePicks,
    rosters,
    voteRecords,
  };
}

async function judgeAiMode(
  draftId: string,
  topic: string,
  personality: string,
  rubric: RubricCategory[],
  players: SafePlayer[],
  picks: SafePick[],
  rosters: RosterInfo[],
): Promise<JudgmentRecord> {
  const judgeInput = await buildJudgeInput(draftId, topic, personality, rubric, players, picks, rosters);
  const result = await judgeRosters(judgeInput);

  return {
    draftId,
    source: result.source,
    playerScores: result.playerScores,
    ranking: result.ranking,
    winnerPlayerIds: result.winnerPlayerIds,
    awards: result.awards,
    explanation: result.explanation,
    model: result.model,
    promptVersion: result.promptVersion,
    idempotencyKey: result.idempotencyKey,
  };
}

function judgeCommunityMode(
  draftId: string,
  players: SafePlayer[],
  picks: SafePick[],
  voteRecords: Vote[],
): JudgmentRecord {
  const playerIds = players.map((p) => p.id);
  const voteShares = communityVoteShares(playerIds, voteRecords);
  const ranking = [...playerIds].sort(
    (a, b) => voteShares[b] - voteShares[a],
  );
  const winners = resolveWinners(voteShares, { mode: "community" });
  const idempotencyKey = `community-${draftId}-${crypto.randomUUID()}`;

  return {
    draftId,
    source: "fallback",
    playerScores: Object.fromEntries(
      playerIds.map((pid) => [pid, { overall: voteShares[pid], categories: {} }]),
    ),
    ranking,
    winnerPlayerIds: winners,
    awards: { bestPick: { pickId: "", itemId: "", playerId: "" }, worstPick: { pickId: "", itemId: "", playerId: "" }, biggestSteal: { pickId: "", itemId: "", playerId: "" } },
    explanation: `Community vote results. ${voteRecords.length} vote(s) cast.`,
    model: null,
    promptVersion: "1.0.0",
    idempotencyKey,
  };
}

async function judgeHybridMode(
  draftId: string,
  topic: string,
  personality: string,
  rubric: RubricCategory[],
  players: SafePlayer[],
  picks: SafePick[],
  rosters: RosterInfo[],
  voteRecords: Vote[],
): Promise<JudgmentRecord> {
  const playerIds = players.map((p) => p.id);

  // Get AI scores
  const judgeInput = await buildJudgeInput(draftId, topic, personality, rubric, players, picks, rosters);
  const aiResult = await judgeRosters(judgeInput);

  const aiScores = Object.fromEntries(
    playerIds.map((pid) => [pid, normalizeAiScore(aiResult.playerScores[pid]?.overall ?? 0)]),
  );

  // Get community scores
  const voteShares = communityVoteShares(playerIds, voteRecords);
  const communityScores = Object.fromEntries(
    playerIds.map((pid) => [pid, voteShares[pid]]),
  );

  // Combine: 70% AI, 30% community
  const combined = hybridScores(aiScores, communityScores);

  const ranking = [...playerIds].sort(
    (a, b) => combined[b] - combined[a],
  );
  const winners = resolveWinners(combined, {
    mode: "hybrid",
    aiScores,
    aggregateMetadata: communityScores,
  });

  const playerScores = Object.fromEntries(
    playerIds.map((pid) => [
      pid,
      {
        overall: combined[pid],
        categories: aiResult.playerScores[pid]?.categories ?? {},
      },
    ]),
  );

  const idempotencyKey = `hybrid-${draftId}-${crypto.randomUUID()}`;

  return {
    draftId,
    source: "ai",
    playerScores,
    ranking,
    winnerPlayerIds: winners,
    awards: aiResult.awards,
    explanation: `Hybrid judgment: 70% AI score, 30% community vote share.\nAI: ${JSON.stringify(aiScores)}\nCommunity: ${JSON.stringify(communityScores)}\nCombined: ${JSON.stringify(combined)}`,
    model: aiResult.model,
    promptVersion: aiResult.promptVersion,
    idempotencyKey,
  };
}

async function fetchDefenses(draftId: string): Promise<DefenseArg[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("arguments")
    .select("player_id, defense_text, skipped")
    .eq("draft_id", draftId);

  if (error) throw new Error(`Failed to fetch defenses: ${error.message}`);
  return (data ?? []).map((d) => ({
    playerId: d.player_id as string,
    defenseText: d.defense_text as string | null,
    skipped: d.skipped as boolean,
  }));
}

async function fetchItems(
  draftId: string,
): Promise<Map<string, { name: string; hidden_metadata: Record<string, number> }>> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("draft_items")
    .select("id, name, hidden_metadata")
    .eq("draft_id", draftId);

  if (error) throw new Error(`Failed to fetch items: ${error.message}`);

  return new Map(
    (data ?? []).map((item) => [
      item.id as string,
      {
        name: item.name as string,
        hidden_metadata: (item.hidden_metadata as Record<string, number>) ?? {},
      },
    ]),
  );
}

async function buildJudgeInput(
  draftId: string,
  topic: string,
  personality: string,
  rubric: RubricCategory[],
  players: SafePlayer[],
  picks: SafePick[],
  rosters: RosterInfo[],
): Promise<JudgeInput> {
  const defenses = await fetchDefenses(draftId);
  const playerIds = players.map((p) => p.id);

  const itemMap = await fetchItems(draftId);

  const rosterPicks: RosterPick[] = picks.map((p) => {
    const item = itemMap.get(p.itemId);
    return {
      pickId: p.id,
      playerId: p.playerId,
      itemId: p.itemId,
      itemName: item?.name ?? "",
      metadata: item?.hidden_metadata ?? {},
      overallPick: p.overallPick,
    };
  });

  const rosterInputs = rosters.map((r) => {
    const playerPicks = rosterPicks
      .filter((p) => p.playerId === r.playerId)
      .sort((a, b) => a.overallPick - b.overallPick);

    return {
      playerId: r.playerId,
      displayName: r.displayName,
      picks: playerPicks.map((p) => ({
        itemName: p.itemName,
        metadata: p.metadata,
        overallPick: p.overallPick,
      })),
    };
  });

  return {
    topic,
    personality,
    rubric,
    rosters: rosterInputs,
    defenses,
    picks: rosterPicks,
    playerIds,
  };
}
