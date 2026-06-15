import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";
import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type CreateRoomInput,
  type RoomProjection,
} from "./schema";

const MAX_ROOM_CODE_RETRIES = 5;

/**
 * Generates a six-character room code from an ambiguity-free alphabet.
 * Excludes characters that look alike: 0, O, I, l, 1.
 */
export function generateRoomCode(): string {
  const chars: string[] = [];
  const alphabetLength = ROOM_CODE_ALPHABET.length;

  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    // Use crypto.getRandomValues for better entropy when available
    const randomIndex = Math.floor(Math.random() * alphabetLength);
    chars.push(ROOM_CODE_ALPHABET[randomIndex]);
  }

  return chars.join("");
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
    judging_mode: string;
    ai_personality: string;
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
  return {
    draftId: draft.id,
    roomCode: draft.room_code,
    topic: draft.topic,
    maxPlayers: draft.max_players,
    rounds: draft.rounds,
    timerSeconds: draft.timer_seconds,
    draftType: draft.draft_type as "standard" | "snake" | "random",
    judgingMode: draft.judging_mode as "ai" | "community" | "hybrid",
    aiPersonality: draft.ai_personality as "analyst" | "hype" | "roast",
    phase: draft.phase,
    hostGuestId: draft.host_guest_id,
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
 * Creates a new draft room.
 * Inserts the draft row, then inserts the host as player at seat 1.
 * Retries on room_code uniqueness conflict.
 */
export async function createRoom(
  input: CreateRoomInput,
  guestId: string,
): Promise<RoomProjection> {
  const db = createAdminClient();

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_ROOM_CODE_RETRIES; attempt++) {
    const roomCode = generateRoomCode();

    const { data: draft, error: draftError } = await db
      .from("drafts")
      .insert({
        room_code: roomCode,
        host_guest_id: guestId,
        topic: input.topic,
        max_players: input.maxPlayers,
        rounds: input.rounds,
        timer_seconds: input.timerSeconds,
        draft_type: input.draftType,
        judging_mode: input.judgingMode,
        ai_personality: input.aiPersonality,
        phase: "LOBBY",
        current_pick_index: 0,
        pick_order: [],
        rubric: {},
      })
      .select()
      .single();

    if (draftError) {
      // Postgres unique violation code is 23505
      if (draftError.code === "23505") {
        lastError = new Error(draftError.message);
        continue;
      }
      throw new AppError("INVALID_INPUT", draftError.message);
    }

    if (!draft) {
      throw new AppError("INVALID_INPUT", "Failed to create draft");
    }

    // Insert host as player at seat 1
    const { data: player, error: playerError } = await db
      .from("draft_players")
      .insert({
        draft_id: draft.id,
        guest_id: guestId,
        display_name: input.displayName,
        seat: 1,
        is_ready: false,
      })
      .select()
      .single();

    if (playerError) {
      // Clean up draft on player insert failure
      await db.from("drafts").delete().eq("id", draft.id);
      throw new AppError("INVALID_INPUT", playerError.message);
    }

    if (!player) {
      throw new AppError("INVALID_INPUT", "Failed to add host as player");
    }

    return buildProjection(draft, [player]);
  }

  throw new AppError(
    "STALE_STATE",
    `Failed to generate a unique room code after ${MAX_ROOM_CODE_RETRIES} attempts: ${lastError?.message}`,
  );
}

/**
 * Joins an existing draft room.
 * Enforces capacity, phase, and display name uniqueness.
 * Allocates the lowest open seat.
 */
export async function joinRoom(
  roomCode: string,
  displayName: string,
  guestId: string,
): Promise<RoomProjection> {
  const db = createAdminClient();

  // Fetch the draft by room code
  const { data: draft, error: draftError } = await db
    .from("drafts")
    .select("*")
    .eq("room_code", roomCode.toUpperCase())
    .single();

  if (draftError || !draft) {
    throw new AppError("ROOM_NOT_FOUND", `Room with code ${roomCode} not found`);
  }

  if (draft.phase !== "LOBBY") {
    throw new AppError("INVALID_PHASE", "Room is no longer in the lobby phase");
  }

  // Fetch active players
  const { data: existingPlayers, error: playersError } = await db
    .from("draft_players")
    .select("*")
    .eq("draft_id", draft.id)
    .is("removed_at", null);

  if (playersError) {
    throw new AppError("INVALID_INPUT", playersError.message);
  }

  const players = existingPlayers ?? [];

  // Check if guest is already in the room
  const existingPlayer = players.find((p) => p.guest_id === guestId);
  if (existingPlayer) {
    return buildProjection(draft, players);
  }

  // Enforce capacity
  if (players.length >= draft.max_players) {
    throw new AppError("ROOM_FULL", "This room is full");
  }

  // Enforce display name uniqueness
  const nameTaken = players.some(
    (p) => p.display_name.toLowerCase() === displayName.toLowerCase(),
  );
  if (nameTaken) {
    throw new AppError("NAME_TAKEN", "This display name is already taken in this room");
  }

  // Find lowest open seat (seats are 1-indexed)
  const occupiedSeats = new Set(players.map((p) => p.seat));
  let nextSeat = 1;
  while (occupiedSeats.has(nextSeat)) {
    nextSeat++;
  }

  // Insert the new player
  const { data: newPlayer, error: insertError } = await db
    .from("draft_players")
    .insert({
      draft_id: draft.id,
      guest_id: guestId,
      display_name: displayName,
      seat: nextSeat,
      is_ready: false,
    })
    .select()
    .single();

  if (insertError) {
    throw new AppError("INVALID_INPUT", insertError.message);
  }

  if (!newPlayer) {
    throw new AppError("INVALID_INPUT", "Failed to join room");
  }

  return buildProjection(draft, [...players, newPlayer]);
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
