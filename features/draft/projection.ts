import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";
import {
  computeTopUndraftedPick,
  rubricFromDraftRecord,
} from "@/features/results/top-undrafted-pick";
import type {
  DraftRoomProjection,
  SafeDraft,
  SafePlayer,
  SafeItem,
  SafePick,
  SafeCommentary,
  SafeDefense,
  SafeVote,
  SafeVetoVote,
  SafeJudgment,
  DraftPhase,
  PickSlot,
  PickingMode,
} from "./types";

export function buildProjection(
  draft: Record<string, unknown>,
  players: Record<string, unknown>[],
  items: Record<string, unknown>[],
  picks: Record<string, unknown>[],
  commentary: Record<string, unknown>[],
  defenses: Record<string, unknown>[],
  votes: Record<string, unknown>[],
  vetoVotes: Record<string, unknown>[],
  judgment: Record<string, unknown> | null,
  serverNow: string,
): DraftRoomProjection {
  const pickOrder = (draft.pick_order as unknown[]) ?? [];
  const hostPlayer = players.find(
    (p) => p.guest_id === draft.host_guest_id,
  );

  const safeDraft: SafeDraft = {
    id: draft.id as string,
    roomCode: draft.room_code as string,
    topic: draft.topic as string,
    phase: draft.phase as DraftPhase,
    hostPlayerId: hostPlayer?.id as string ?? "",
    maxPlayers: draft.max_players as number,
    rounds: draft.rounds as number,
    draftType: draft.draft_type as SafeDraft["draftType"],
    pickingMode: (draft.picking_mode as SafeDraft["pickingMode"]) ?? "pool",
    judgingMode: draft.judging_mode as SafeDraft["judgingMode"],
    aiPersonality: draft.ai_personality as string,
    customJudgePrompt: (draft.custom_judge_prompt as string | null) ?? null,
    timerSeconds: (draft.timer_seconds as number | null) ?? null,
    completedAt: (draft.completed_at as string | null) ?? null,
    pickOrder: pickOrder.map((s) => {
      const slot = s as Record<string, unknown>;
      return {
        overallPick: slot.overallPick as number,
        round: slot.round as number,
        pickInRound: slot.pickInRound as number,
        seat: slot.seat as number,
      } as PickSlot;
    }),
    currentPickIndex: draft.current_pick_index as number,
    turnDeadline: (draft.turn_deadline as string | null) ?? null,
    judgingStartedAt: (draft.judging_started_at as string | null) ?? null,
    pendingPickId: (draft.pending_pick_id as string | null) ?? null,
  };

  const safePlayers: SafePlayer[] = (players ?? []).map((p) => ({
    id: p.id as string,
    displayName: p.display_name as string,
    seat: p.seat as number,
    isReady: p.is_ready as boolean,
    isHost: (p.guest_id as string) === draft.host_guest_id,
  }));

  const isOffTheDome = (draft.picking_mode as string) === "off_the_dome";

  const safeItems: SafeItem[] = isOffTheDome
    ? []
    : (items ?? []).map((item) => ({
        id: item.id as string,
        name: item.name as string,
        source: item.source as "ai" | "manual",
        isAvailable: item.is_available as boolean,
      }));

  const itemNameById = new Map(
    (items ?? []).map((item) => [item.id as string, item.name as string]),
  );

  const safePicks: SafePick[] = (picks ?? []).map((p) => {
    const itemId = (p.item_id as string | null) ?? null;
    const storedName = (p.item_name as string | null) ?? null;
    const itemName =
      storedName ?? (itemId ? itemNameById.get(itemId) ?? null : null);

    return {
      id: p.id as string,
      playerId: p.player_id as string,
      itemId: itemId ?? "",
      itemName,
      overallPick: p.overall_pick as number,
      round: p.round as number,
      pickInRound: p.pick_in_round as number,
      isAutoPick: p.is_auto_pick as boolean,
      forfeited: (p.forfeited as boolean) ?? false,
      vetoChallengeResolved: (p.veto_challenge_resolved as boolean) ?? false,
    };
  });

  const safeCommentary: SafeCommentary[] = (commentary ?? []).map((c) => ({
    id: c.id as string,
    pickId: (c.pick_id as string | null) ?? null,
    personality: c.personality as string,
    text: c.text as string,
    triggerTags: (c.trigger_tags as string[]) ?? [],
    createdAt: c.created_at as string,
  }));

  const safeDefenses: SafeDefense[] = (defenses ?? []).map((d) => ({
    id: d.id as string,
    playerId: d.player_id as string,
    defenseText: (d.defense_text as string | null) ?? null,
    skipped: d.skipped as boolean,
    submittedAt: d.submitted_at as string,
  }));

  const safeVotes: SafeVote[] = (votes ?? []).map((v) => ({
    id: v.id as string,
    voterPlayerId: v.voter_player_id as string,
    selectedPlayerId: v.selected_player_id as string,
  }));

  const safeVetoVotes: SafeVetoVote[] = (vetoVotes ?? []).map((v) => ({
    id: v.id as string,
    pickId: v.pick_id as string,
    voterPlayerId: v.voter_player_id as string,
    wantsVeto: v.wants_veto as boolean,
  }));

  const safeJudgment: SafeJudgment | null = judgment
    ? {
        id: judgment.id as string,
        source: judgment.source as "ai" | "fallback",
        playerScores: judgment.player_scores as Record<string, number>,
        ranking: judgment.ranking as string[],
        winnerPlayerIds: judgment.winner_player_ids as string[],
        awards: judgment.awards as Record<string, unknown>,
        explanation: judgment.explanation as string,
        model: (judgment.model as string | null) ?? null,
        createdAt: judgment.created_at as string,
      }
    : null;

  const pickingMode = (draft.picking_mode as PickingMode) ?? "pool";
  const topUndraftedPick = computeTopUndraftedPick(
    (items ?? []).map((item) => ({
      id: item.id as string,
      name: item.name as string,
      is_available: item.is_available as boolean,
      hidden_metadata: (item.hidden_metadata as Record<string, number>) ?? {},
    })),
    rubricFromDraftRecord(draft.rubric as Record<string, number> | null),
    pickingMode,
  );

  return {
    draft: safeDraft,
    players: safePlayers,
    availableItems: safeItems,
    picks: safePicks,
    commentary: safeCommentary,
    defenses: safeDefenses,
    votes: safeVotes,
    vetoVotes: safeVetoVotes,
    judgment: safeJudgment,
    topUndraftedPick,
    serverNow,
  };
}

export async function getDraftRoomProjection(
  draftId: string,
): Promise<DraftRoomProjection> {
  const db = createAdminClient();

  // Self-heal drafts stuck in DEFENSE when every player already responded.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db.rpc as any)("maybe_advance_from_defense", { p_draft_id: draftId });
  // Self-heal drafts stuck in VOTING when every player already voted.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db.rpc as any)("maybe_advance_from_voting", { p_draft_id: draftId });
  // Self-heal off-the-dome drafts stuck in VETO_VOTING (solo play, etc.).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db.rpc as any)("maybe_resolve_veto_voting", { p_draft_id: draftId });

  const [
    { data: draft, error: draftError },
    { data: players, error: playersError },
    { data: items, error: itemsError },
    { data: picks, error: picksError },
    { data: commentary, error: commentaryError },
    { data: defenses, error: defensesError },
    { data: votes, error: votesError },
    { data: vetoVotes, error: vetoVotesError },
    { data: judgment, error: judgmentError },
    { data: nowResult },
  ] = await Promise.all([
    db.from("drafts").select("*").eq("id", draftId).single(),
    db
      .from("draft_players")
      .select("*")
      .eq("draft_id", draftId)
      .is("removed_at", null),
    db.from("draft_items").select("*").eq("draft_id", draftId),
    db.from("picks").select("*").eq("draft_id", draftId).order("overall_pick", { ascending: true }),
    db.from("commentary").select("*").eq("draft_id", draftId).order("created_at", { ascending: true }),
    db.from("arguments").select("*").eq("draft_id", draftId),
    db.from("votes").select("*").eq("draft_id", draftId),
    db.from("pick_veto_votes").select("*").eq("draft_id", draftId),
    db.from("judgments").select("*").eq("draft_id", draftId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.rpc("get_server_time"),
  ]);

  if (draftError || !draft) {
    throw new AppError("ROOM_NOT_FOUND", "Draft not found");
  }
  if (playersError) throw new Error("Failed to fetch draft players");
  if (itemsError) throw new Error("Failed to fetch draft items");
  if (picksError) throw new Error("Failed to fetch draft picks");
  if (commentaryError) throw new Error("Failed to fetch draft commentary");
  if (defensesError) throw new Error("Failed to fetch draft defenses");
  if (votesError) throw new Error("Failed to fetch draft votes");
  if (vetoVotesError) throw new Error("Failed to fetch draft veto votes");
  if (judgmentError) throw new Error("Failed to fetch draft judgment");

  const serverNowRaw = nowResult as unknown;
  const serverNow = Array.isArray(serverNowRaw)
    ? String(serverNowRaw[0] ?? new Date().toISOString())
    : String(serverNowRaw ?? new Date().toISOString());

  return buildProjection(
    draft,
    players ?? [],
    items ?? [],
    picks ?? [],
    commentary ?? [],
    defenses ?? [],
    votes ?? [],
    vetoVotes ?? [],
    (judgment as Record<string, unknown> | null) ?? null,
    serverNow,
  );
}
