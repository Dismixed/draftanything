import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";
import { getRoom } from "@/features/room/service";
import type { RoomProjection } from "@/features/room/schema";
import { pickOffTheDome } from "./dome-pick";
import { nextBot, type BotStyle } from "./roster";
import { planBotTurn, type BotTurnState } from "./turn";

const ADD_ATTEMPTS = 3;

function throwRoomError(message: string): never {
  if (message.includes("ROOM_NOT_FOUND")) {
    throw new AppError("ROOM_NOT_FOUND", "Draft not found");
  }
  if (message.includes("NOT_HOST")) {
    throw new AppError("NOT_HOST", "Only the host can manage AI drafters");
  }
  if (message.includes("INVALID_PHASE")) {
    throw new AppError("INVALID_PHASE", "AI drafters can only be changed in the lobby");
  }
  if (message.includes("ROOM_FULL")) {
    throw new AppError("ROOM_FULL", "This room is full");
  }
  if (message.includes("NOT_A_BOT")) {
    throw new AppError("INVALID_INPUT", "That player is not an AI drafter");
  }
  throw new AppError("INVALID_INPUT", message);
}

/** Seats the next AI drafter from the roster in the lowest empty seat. Host only. */
export async function addBot(
  draftId: string,
  hostGuestId: string,
): Promise<{ room: RoomProjection; style: BotStyle }> {
  const db = createAdminClient();

  for (let attempt = 1; ; attempt += 1) {
    const { data: players, error: playersError } = await db
      .from("draft_players")
      .select("display_name, bot_style")
      .eq("draft_id", draftId)
      .is("removed_at", null);

    if (playersError) throw new AppError("INVALID_INPUT", playersError.message);

    const bot = nextBot(
      (players ?? []).map((p) => ({ displayName: p.display_name, botStyle: p.bot_style })),
    );

    const { error } = await db.rpc("add_bot_player", {
      p_draft_id: draftId,
      p_host_guest_id: hostGuestId,
      p_display_name: bot.name,
      p_bot_style: bot.style,
    });

    if (!error) {
      return { room: await getRoom(draftId), style: bot.style };
    }

    // Someone took the name between the read and the insert: read again.
    const message = error.message ?? "";
    if (message.includes("NAME_TAKEN") && attempt < ADD_ATTEMPTS) continue;
    throwRoomError(message);
  }
}

/** Removes an AI drafter from the lobby. Host only. */
export async function removeBot(
  draftId: string,
  hostGuestId: string,
  playerId: string,
): Promise<RoomProjection> {
  const db = createAdminClient();

  const { error } = await db.rpc("remove_bot_player", {
    p_draft_id: draftId,
    p_host_guest_id: hostGuestId,
    p_player_id: playerId,
  });

  if (error) throwRoomError(error.message ?? "");
  return getRoom(draftId);
}

async function loadTurnState(draftId: string): Promise<BotTurnState> {
  const db = createAdminClient();

  const [
    { data: draft, error: draftError },
    { data: players, error: playersError },
    { data: picks, error: picksError },
    { data: items, error: itemsError },
  ] = await Promise.all([
    db
      .from("drafts")
      .select(
        "id, phase, topic, picking_mode, current_pick_index, pick_order, rubric, vetoed_names",
      )
      .eq("id", draftId)
      .single(),
    db
      .from("draft_players")
      .select("id, seat, is_bot, bot_style")
      .eq("draft_id", draftId)
      .is("removed_at", null),
    db
      .from("picks")
      .select("player_id, item_id, item_name, forfeited")
      .eq("draft_id", draftId)
      .order("overall_pick", { ascending: true }),
    db
      .from("draft_items")
      .select("id, name, is_available, hidden_metadata")
      .eq("draft_id", draftId),
  ]);

  if (draftError || !draft) throw new AppError("ROOM_NOT_FOUND", "Draft not found");
  if (playersError || picksError || itemsError) {
    throw new Error("Failed to load draft state for an AI pick");
  }

  const itemNameById = new Map((items ?? []).map((item) => [item.id, item.name]));

  return {
    draft: {
      id: draft.id,
      phase: draft.phase,
      topic: draft.topic,
      pickingMode: draft.picking_mode,
      currentPickIndex: draft.current_pick_index,
      pickOrder: (draft.pick_order as Array<{ seat: number; overallPick: number }>) ?? [],
      rubric: (draft.rubric as Record<string, number>) ?? {},
      vetoedNames: Array.isArray(draft.vetoed_names)
        ? (draft.vetoed_names as unknown[]).filter((n): n is string => typeof n === "string")
        : [],
    },
    players: (players ?? []).map((p) => ({
      id: p.id,
      seat: p.seat,
      isBot: p.is_bot,
      botStyle: p.bot_style,
    })),
    picks: (picks ?? []).map((p) => ({
      playerId: p.player_id,
      itemId: p.item_id,
      itemName: p.item_name ?? (p.item_id ? itemNameById.get(p.item_id) ?? null : null),
      forfeited: p.forfeited,
    })),
    items: (items ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      isAvailable: item.is_available,
      scores: (item.hidden_metadata as Record<string, number>) ?? {},
    })),
  };
}

export type BotPickOutcome =
  | {
      status: "picked";
      style: BotStyle;
      pickingMode: string;
      forfeited: boolean;
      phase: string;
    }
  /** The turn had already moved on, or is not an AI drafter's. Not an error. */
  | { status: "stale" };

/**
 * Makes the pick for the AI drafter on the clock, if `expectedPick` is still
 * the current turn. Safe to call from several browsers at once: the database
 * function accepts one pick per turn and the rest come back as stale.
 */
export async function makeBotPick(
  draftId: string,
  expectedPick: number,
): Promise<BotPickOutcome> {
  const state = await loadTurnState(draftId);
  const plan = planBotTurn(state, expectedPick);

  if (plan.kind === "stale") return { status: "stale" };

  let itemId: string | undefined;
  let itemName: string | undefined;
  let forfeited = plan.kind === "forfeit";

  if (plan.kind === "pool") {
    itemId = plan.itemId;
  } else if (plan.kind === "dome") {
    const result = await pickOffTheDome(plan.input);
    if (result.kind === "pick") itemName = result.name;
    else forfeited = true;
  }

  const db = createAdminClient();
  const { data, error } = await db.rpc("submit_bot_pick", {
    p_draft_id: draftId,
    p_expected_pick: expectedPick,
    p_item_id: itemId,
    p_item_name: itemName,
    p_forfeited: forfeited,
  });

  if (error) {
    const message = error.message ?? "";
    if (
      message.includes("STALE_STATE") ||
      message.includes("ITEM_UNAVAILABLE") ||
      message.includes("NOT_BOT_TURN") ||
      message.includes("INVALID_PHASE")
    ) {
      return { status: "stale" };
    }
    if (message.includes("ROOM_NOT_FOUND")) {
      throw new AppError("ROOM_NOT_FOUND", "Draft not found");
    }
    throw new Error(`submit_bot_pick failed: ${message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;

  return {
    status: "picked",
    style: plan.bot.style,
    pickingMode: state.draft.pickingMode,
    forfeited,
    phase: (row as { o_phase?: string } | null)?.o_phase ?? "DRAFTING",
  };
}
