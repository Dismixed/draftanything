import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";
import type {
  DraftRoomProjection,
  SafeDraft,
  SafePlayer,
  SafeItem,
  SafePick,
  SafeCommentary,
  DraftPhase,
  PickSlot,
} from "./types";

export function buildProjection(
  draft: Record<string, unknown>,
  players: Record<string, unknown>[],
  items: Record<string, unknown>[],
  picks: Record<string, unknown>[],
  commentary: Record<string, unknown>[],
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
    judgingMode: draft.judging_mode as SafeDraft["judgingMode"],
    aiPersonality: draft.ai_personality as string,
    timerSeconds: (draft.timer_seconds as number | null) ?? null,
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
  };

  const safePlayers: SafePlayer[] = (players ?? []).map((p) => ({
    id: p.id as string,
    displayName: p.display_name as string,
    seat: p.seat as number,
    isReady: p.is_ready as boolean,
    isHost: (p.guest_id as string) === draft.host_guest_id,
  }));

  const safeItems: SafeItem[] = (items ?? []).map((item) => ({
    id: item.id as string,
    name: item.name as string,
    source: item.source as "ai" | "manual",
    isAvailable: item.is_available as boolean,
  }));

  const safePicks: SafePick[] = (picks ?? []).map((p) => ({
    id: p.id as string,
    playerId: p.player_id as string,
    itemId: p.item_id as string,
    overallPick: p.overall_pick as number,
    round: p.round as number,
    pickInRound: p.pick_in_round as number,
    isAutoPick: p.is_auto_pick as boolean,
  }));

  const safeCommentary: SafeCommentary[] = (commentary ?? []).map((c) => ({
    id: c.id as string,
    pickId: (c.pick_id as string | null) ?? null,
    personality: c.personality as string,
    text: c.text as string,
  }));

  return {
    draft: safeDraft,
    players: safePlayers,
    availableItems: safeItems,
    picks: safePicks,
    commentary: safeCommentary,
    serverNow,
  };
}

export async function getDraftRoomProjection(
  draftId: string,
): Promise<DraftRoomProjection> {
  const db = createAdminClient();

  const [
    { data: draft, error: draftError },
    { data: players, error: playersError },
    { data: items, error: itemsError },
    { data: picks, error: picksError },
    { data: commentary, error: commentaryError },
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
    db.rpc("get_server_time"),
  ]);

  if (draftError || !draft) {
    throw new AppError("ROOM_NOT_FOUND", "Draft not found");
  }
  if (playersError) throw new AppError("INVALID_INPUT", playersError.message);
  if (itemsError) throw new AppError("INVALID_INPUT", itemsError.message);
  if (picksError) throw new AppError("INVALID_INPUT", picksError.message);
  if (commentaryError) throw new AppError("INVALID_INPUT", commentaryError.message);

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
    serverNow,
  );
}
