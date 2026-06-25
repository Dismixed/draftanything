import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";
import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type CreateRoomInput,
  type RoomProjection,
  type UpdateConfigInput,
} from "./schema";

/**
 * Generates a six-character room code from an ambiguity-free alphabet.
 * Excludes characters that look alike: 0, O, I, l, 1.
 * Uses crypto.getRandomValues() for cryptographically secure randomness.
 */
export function generateRoomCode(): string {
  const alphabet = ROOM_CODE_ALPHABET;
  const array = new Uint32Array(ROOM_CODE_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, (n) => alphabet[n % alphabet.length]).join("");
}

function buildProjection(
  draft: {
    id: string;
    room_code: string;
    topic: string;
    max_players: number;
    rounds: number;
    timer_seconds: number | null;
    draft_type: string;
    picking_mode: string;
    judging_mode: string;
    ai_personality: string;
    custom_judge_prompt: string | null;
    phase: string;
    host_guest_id: string;
  },
  players: Array<{
    id: string;
    display_name: string;
    seat: number;
    is_ready: boolean;
    guest_id: string;
  }>,
): RoomProjection {
  // Determine the host player ID from the player who matches the host guest
  const hostPlayer = players.find((p) => p.guest_id === draft.host_guest_id);
  const hostPlayerId = hostPlayer?.id ?? "";

  return {
    draftId: draft.id,
    roomCode: draft.room_code,
    topic: draft.topic,
    maxPlayers: draft.max_players,
    rounds: draft.rounds,
    timerSeconds: draft.timer_seconds,
    draftType: draft.draft_type as "standard" | "snake" | "random",
    pickingMode: (draft.picking_mode as "pool" | "off_the_dome") ?? "pool",
    judgingMode: draft.judging_mode as "ai" | "community" | "hybrid",
    aiPersonality: draft.ai_personality as "analyst" | "hype" | "roast" | "custom",
    customJudgePrompt: draft.custom_judge_prompt,
    phase: draft.phase,
    hostPlayerId,
    players: players.map((p) => ({
      id: p.id,
      displayName: p.display_name,
      seat: p.seat,
      isReady: p.is_ready,
      isHost: p.guest_id === draft.host_guest_id,
    })),
  };
}

/**
 * Creates a new draft room atomically via the create_draft RPC.
 * The RPC inserts the draft and host player in a single transaction,
 * retrying on room code collisions. No orphaned rows can result.
 */
export async function createRoom(
  input: CreateRoomInput,
  guestId: string,
): Promise<RoomProjection> {
  const db = createAdminClient();

  const { data: rpcRows, error: rpcError } = await db.rpc("create_draft", {
    p_host_guest_id: guestId,
    p_display_name: input.displayName,
    p_topic: input.topic,
    p_max_players: input.maxPlayers,
    p_rounds: input.rounds,
    p_draft_type: input.draftType,
    p_judging_mode: input.judgingMode,
    p_ai_personality: input.aiPersonality,
    // Generated RPC types omit nullability; Postgres accepts null for timer off.
    p_timer_seconds: input.timerSeconds as number,
    p_custom_judge_prompt: input.customJudgePrompt ?? undefined,
    p_picking_mode: input.pickingMode,
  });

  if (rpcError) {
    const msg = rpcError.message ?? "";
    if (msg.includes("ROOM_CODE_CONFLICT")) {
      throw new AppError(
        "STALE_STATE",
        "Failed to generate a unique room code. Please try again.",
      );
    }
    throw new AppError("INVALID_INPUT", rpcError.message);
  }

  const row = Array.isArray(rpcRows) ? rpcRows[0] : null;
  if (!row?.draft_id) {
    throw new AppError("INVALID_INPUT", "Failed to retrieve created room");
  }

  return getRoom(row.draft_id as string);
}

/**
 * Joins an existing draft room.
 * Uses the join_draft RPC which locks the draft row, enforces capacity and
 * uniqueness atomically, and allocates the lowest open seat.
 */
export async function joinRoom(
  roomCode: string,
  displayName: string,
  guestId: string,
): Promise<RoomProjection> {
  const db = createAdminClient();

  // Resolve draft ID from room code (read-only; the RPC holds the real lock)
  const { data: draftRow, error: lookupError } = await db
    .from("drafts")
    .select("id")
    .eq("room_code", roomCode.toUpperCase())
    .single();

  if (lookupError || !draftRow) {
    throw new AppError("ROOM_NOT_FOUND", `Room with code ${roomCode} not found`);
  }

  // Call the transactional RPC — handles locking, capacity, uniqueness, and seat allocation
  const { error: rpcError } = await db.rpc("join_draft", {
    p_draft_id: draftRow.id,
    p_guest_id: guestId,
    p_display_name: displayName,
  });

  if (rpcError) {
    // Map Postgres raise exception messages to AppError codes
    const msg = rpcError.message ?? "";
    if (msg.includes("ROOM_NOT_FOUND")) {
      throw new AppError("ROOM_NOT_FOUND", `Room with code ${roomCode} not found`);
    }
    if (msg.includes("INVALID_PHASE")) {
      throw new AppError("INVALID_PHASE", "Room is no longer in the lobby phase");
    }
    if (msg.includes("ROOM_FULL")) {
      throw new AppError("ROOM_FULL", "This room is full");
    }
    if (msg.includes("NAME_TAKEN")) {
      throw new AppError("NAME_TAKEN", "This display name is already taken in this room");
    }
    throw new AppError("INVALID_INPUT", rpcError.message);
  }

  // Return the full room projection after joining
  return getRoom(draftRow.id);
}

/**
 * Fetches a room projection by draft ID.
 */
export async function getRoom(draftId: string): Promise<RoomProjection> {
  const db = createAdminClient();

  const { data: draft, error: draftError } = await db
    .from("drafts")
    .select("*")
    .eq("id", draftId)
    .single();

  if (draftError || !draft) {
    throw new AppError("ROOM_NOT_FOUND", `Draft ${draftId} not found`);
  }

  const { data: players, error: playersError } = await db
    .from("draft_players")
    .select("*")
    .eq("draft_id", draftId)
    .is("removed_at", null);

  if (playersError) {
    throw new AppError("INVALID_INPUT", playersError.message);
  }

  return buildProjection(draft, players ?? []);
}

/**
 * Resolves the draft_players.id for a given guest in a draft.
 * Returns an empty string if the guest is not an active player in this room.
 */
export async function getMyPlayerId(
  draftId: string,
  guestId: string,
): Promise<string> {
  const db = createAdminClient();

  const { data } = await db
    .from("draft_players")
    .select("id")
    .eq("draft_id", draftId)
    .eq("guest_id", guestId)
    .is("removed_at", null)
    .single();

  return data?.id ?? "";
}

/**
 * Fetches a room projection by room code.
 */
export async function getRoomByCode(roomCode: string): Promise<RoomProjection> {
  const db = createAdminClient();

  const { data: draft, error: draftError } = await db
    .from("drafts")
    .select("*")
    .eq("room_code", roomCode.toUpperCase())
    .single();

  if (draftError || !draft) {
    throw new AppError("ROOM_NOT_FOUND", `Room with code ${roomCode} not found`);
  }

  const { data: players, error: playersError } = await db
    .from("draft_players")
    .select("*")
    .eq("draft_id", draft.id)
    .is("removed_at", null);

  if (playersError) {
    throw new AppError("INVALID_INPUT", playersError.message);
  }

  return buildProjection(draft, players ?? []);
}

/**
 * Resets a completed draft back to LOBBY for a rematch.
 * Only the host can trigger this. Clears all draft data but keeps players.
 */
export async function resetForRematch(
  draftId: string,
  guestId: string,
): Promise<RoomProjection> {
  const db = createAdminClient();

  const { error } = await db.rpc("reset_draft_for_rematch", {
    p_draft_id: draftId,
    p_host_guest_id: guestId,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("ROOM_NOT_FOUND")) {
      throw new AppError("ROOM_NOT_FOUND", `Draft ${draftId} not found`);
    }
    if (msg.includes("NOT_HOST")) {
      throw new AppError("NOT_HOST", "Only the host can start a rematch");
    }
    if (msg.includes("INVALID_PHASE")) {
      throw new AppError("INVALID_PHASE", "Room must be in COMPLETE phase to rematch");
    }
    throw new AppError("INVALID_INPUT", error.message);
  }

  return getRoom(draftId);
}

/**
 * Soft-removes the current player from a LOBBY-phase draft.
 * Idempotent when the player is already gone.
 */
export async function leaveRoom(
  draftId: string,
  guestId: string,
): Promise<void> {
  const db = createAdminClient();

  const { error } = await db.rpc("leave_draft", {
    p_draft_id: draftId,
    p_guest_id: guestId,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("ROOM_NOT_FOUND")) {
      throw new AppError("ROOM_NOT_FOUND", `Draft ${draftId} not found`);
    }
    if (msg.includes("INVALID_PHASE")) {
      throw new AppError("INVALID_PHASE", "Room is no longer in the lobby phase");
    }
    throw new AppError("INVALID_INPUT", error.message);
  }
}

/**
 * Updates draft configuration while in LOBBY. Host-only.
 */
export async function updateRoomConfig(
  draftId: string,
  guestId: string,
  config: UpdateConfigInput,
): Promise<RoomProjection> {
  const db = createAdminClient();

  const { error } = await db.rpc("update_draft_config", {
    p_draft_id: draftId,
    p_host_guest_id: guestId,
    p_topic: config.topic,
    p_max_players: config.maxPlayers,
    p_rounds: config.rounds,
    p_timer_seconds: config.timerSeconds as number,
    p_draft_type: config.draftType,
    p_picking_mode: config.pickingMode,
    p_judging_mode: config.judgingMode,
    p_ai_personality: config.aiPersonality,
    p_custom_judge_prompt: (config.customJudgePrompt ?? null) as string,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("ROOM_NOT_FOUND")) {
      throw new AppError("ROOM_NOT_FOUND", `Draft ${draftId} not found`);
    }
    if (msg.includes("NOT_HOST")) {
      throw new AppError("NOT_HOST", "Only the host can edit configuration");
    }
    if (msg.includes("INVALID_PHASE")) {
      throw new AppError("INVALID_PHASE", "Room must be in LOBBY phase to edit configuration");
    }
    if (msg.includes("ROOM_FULL")) {
      throw new AppError("ROOM_FULL", "Cannot reduce max players below current player count");
    }
    throw new AppError("INVALID_INPUT", error.message);
  }

  return getRoom(draftId);
}
