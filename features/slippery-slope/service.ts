import "server-only";

import type { Question } from "@/components/slippery-slope/data";
import { DEFAULT_PLAYER_EMOJIS, generateSlMap } from "@/components/slippery-slope/data";
import { fetchQuestions } from "@/lib/brain-dead/trivia-api";
import { AppError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { pickQuestionFromPool } from "./game-logic";
import { resolveWagerTopicHint } from "./topic-hint";
import { enrichQuestionsWithTopics } from "./topic";
import type {
  CreateSsRoomInput,
  SsLastEvent,
  SsQuestionProjection,
  SsRoomProjection,
} from "./schema";

interface DbRoom {
  id: string;
  room_code: string;
  host_guest_id: string;
  category: string;
  max_players: number;
  phase: string;
  turn_phase: string | null;
  current_seat: number | null;
  current_wager: number | null;
  current_question: Question | null;
  sl_map: Record<string, number> | null;
  winner_player_id: string | null;
  last_event: SsLastEvent | null;
  turn_deadline: string | null;
  turn_seq: number;
  question_pool: Question[];
  used_question_indices: number[];
  question_token: string;
}

interface DbPlayer {
  id: string;
  guest_id: string;
  display_name: string;
  seat: number;
  color_index: number;
  emoji: string;
  position: number;
}

function mapRpcError(msg: string): never {
  if (msg.includes("ROOM_NOT_FOUND")) {
    throw new AppError("ROOM_NOT_FOUND", "Room not found");
  }
  if (msg.includes("ROOM_FULL")) {
    throw new AppError("ROOM_FULL", "This room is full");
  }
  if (msg.includes("NAME_TAKEN")) {
    throw new AppError("NAME_TAKEN", "This display name is already taken in this room");
  }
  if (msg.includes("EMOJI_TAKEN")) {
    throw new AppError("NAME_TAKEN", "That emoji is already taken by another player");
  }
  if (msg.includes("NOT_HOST")) {
    throw new AppError("NOT_HOST", "Only the host can perform this action");
  }
  if (msg.includes("INVALID_PHASE")) {
    throw new AppError("INVALID_PHASE", "This action is not allowed in the current phase");
  }
  if (msg.includes("STALE_STATE")) {
    throw new AppError("STALE_STATE", "The game state has changed. Refresh and try again.");
  }
  if (msg.includes("UNAUTHORIZED")) {
    throw new AppError("UNAUTHORIZED", "You are not a player in this room");
  }
  if (msg.includes("ROOM_CODE_CONFLICT")) {
    throw new AppError(
      "STALE_STATE",
      "Failed to generate a unique room code. Please try again.",
    );
  }
  throw new AppError("INVALID_INPUT", msg);
}

function sanitizeQuestion(
  question: Question | null,
  turnPhase: string | null,
  phase: string,
  lastEvent: SsLastEvent | null,
): SsQuestionProjection | null {
  if (!question) return null;

  const base: SsQuestionProjection = {
    q: question.q,
    a: question.a,
    d: question.d,
    cat: question.cat,
    topic: question.topic,
  };

  if (phase === "WIN" || lastEvent) {
    return { ...base, c: question.c };
  }

  if (turnPhase === "QUESTION") {
    return base;
  }

  return { ...base, c: question.c };
}

function computeWagerTopicHint(room: DbRoom): string | null {
  if (room.phase !== "PLAYING" || room.turn_phase !== "WAGER") {
    return null;
  }

  if (room.current_question) {
    return resolveWagerTopicHint(room.category, room.current_question);
  }

  const preview = pickQuestionFromPool(
    room.question_pool,
    5,
    room.used_question_indices,
  );
  if (preview) {
    return resolveWagerTopicHint(room.category, preview.question);
  }

  return resolveWagerTopicHint(room.category, { cat: room.category });
}

function buildProjection(
  room: DbRoom,
  players: DbPlayer[],
  myGuestId?: string,
): SsRoomProjection {
  const hostPlayer = players.find((p) => p.guest_id === room.host_guest_id);
  const turnPhase =
    room.turn_phase === "WAGER" || room.turn_phase === "QUESTION"
      ? room.turn_phase
      : null;

  return {
    roomId: room.id,
    roomCode: room.room_code,
    category: room.category,
    maxPlayers: room.max_players,
    phase: room.phase as SsRoomProjection["phase"],
    turnPhase,
    currentSeat: room.current_seat,
    currentWager: room.current_wager,
    currentQuestion: sanitizeQuestion(
      room.current_question,
      turnPhase,
      room.phase,
      room.last_event,
    ),
    wagerTopicHint: computeWagerTopicHint(room),
    slMap: room.sl_map ?? {},
    winnerPlayerId: room.winner_player_id,
    lastEvent: room.last_event,
    turnDeadline: room.turn_deadline,
    turnSeq: room.turn_seq,
    players: players.map((p) => ({
      id: p.id,
      displayName: p.display_name,
      seat: p.seat,
      colorIndex: p.color_index,
      emoji: p.emoji || DEFAULT_PLAYER_EMOJIS[p.seat - 1] || "🎯",
      position: p.position,
      isHost: p.guest_id === room.host_guest_id,
    })),
    hostPlayerId: hostPlayer?.id ?? "",
    myGuestId,
    serverNow: new Date().toISOString(),
  };
}

function parseRoomRow(data: Record<string, unknown>): DbRoom {
  return {
    id: data.id as string,
    room_code: data.room_code as string,
    host_guest_id: data.host_guest_id as string,
    category: data.category as string,
    max_players: data.max_players as number,
    phase: data.phase as string,
    turn_phase: (data.turn_phase as string | null) ?? null,
    current_seat: (data.current_seat as number | null) ?? null,
    current_wager: (data.current_wager as number | null) ?? null,
    current_question: (data.current_question as Question | null) ?? null,
    sl_map: (data.sl_map as Record<string, number> | null) ?? null,
    winner_player_id: (data.winner_player_id as string | null) ?? null,
    last_event: (data.last_event as SsLastEvent | null) ?? null,
    turn_deadline: (data.turn_deadline as string | null) ?? null,
    turn_seq: data.turn_seq as number,
    question_pool: (data.question_pool as Question[]) ?? [],
    used_question_indices: (data.used_question_indices as number[]) ?? [],
    question_token: (data.question_token as string) ?? "",
  };
}

async function fetchRoomRow(roomId: string): Promise<DbRoom> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from as any)("ss_rooms")
    .select("*")
    .eq("id", roomId)
    .single();

  if (error || !data) {
    throw new AppError("ROOM_NOT_FOUND", `Room ${roomId} not found`);
  }

  return parseRoomRow(data as Record<string, unknown>);
}

async function fetchPlayers(roomId: string): Promise<DbPlayer[]> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from as any)("ss_players")
    .select("id, guest_id, display_name, seat, color_index, emoji, position")
    .eq("room_id", roomId)
    .is("removed_at", null)
    .order("seat");

  if (error) {
    throw new AppError("INVALID_INPUT", error.message);
  }

  return (data ?? []) as DbPlayer[];
}

export async function createSsRoom(
  input: CreateSsRoomInput,
  guestId: string,
): Promise<SsRoomProjection> {
  const db = createAdminClient();

  const { data: rpcRows, error } = await (db.rpc as any)("create_ss_room", {
      p_host_guest_id: guestId,
      p_display_name: input.displayName,
      p_category: input.category,
      p_max_players: input.maxPlayers,
  });

  if (error) mapRpcError(error.message ?? "");

  const row = Array.isArray(rpcRows) ? rpcRows[0] : null;
  if (!row || typeof row !== "object" || !("room_id" in row)) {
    throw new AppError("INVALID_INPUT", "Failed to create room");
  }

  return getSsRoom((row as { room_id: string }).room_id, guestId);
}

export async function joinSsRoom(
  roomCode: string,
  displayName: string,
  guestId: string,
): Promise<SsRoomProjection> {
  const db = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: draftRow, error: lookupError } = await (db.from as any)("ss_rooms")
    .select("id")
    .eq("room_code", roomCode.toUpperCase())
    .single();

  if (lookupError || !draftRow) {
    throw new AppError("ROOM_NOT_FOUND", `Room with code ${roomCode} not found`);
  }

  const roomId = (draftRow as { id: string }).id;

  const { error } = await (db.rpc as any)("join_ss_room", {
      p_room_id: roomId,
      p_guest_id: guestId,
      p_display_name: displayName,
  });

  if (error) mapRpcError(error.message ?? "");

  return getSsRoom(roomId, guestId);
}

export async function getSsRoom(
  roomId: string,
  myGuestId?: string,
): Promise<SsRoomProjection> {
  const room = await fetchRoomRow(roomId);
  const players = await fetchPlayers(roomId);
  return buildProjection(room, players, myGuestId);
}

export async function getSsRoomByCode(
  roomCode: string,
  myGuestId?: string,
): Promise<SsRoomProjection> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from as any)("ss_rooms")
    .select("id")
    .eq("room_code", roomCode.toUpperCase())
    .single();

  if (error || !data) {
    throw new AppError("ROOM_NOT_FOUND", `Room with code ${roomCode} not found`);
  }

  return getSsRoom((data as { id: string }).id, myGuestId);
}

export async function getMySsPlayerId(
  roomId: string,
  guestId: string,
): Promise<string> {
  const db = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (db.from as any)("ss_players")
    .select("id")
    .eq("room_id", roomId)
    .eq("guest_id", guestId)
    .is("removed_at", null)
    .single();

  return (data as { id: string } | null)?.id ?? "";
}

export async function leaveSsRoom(roomId: string, guestId: string): Promise<void> {
  const db = createAdminClient();
  const { error } = await (db.rpc as any)("leave_ss_room", {
      p_room_id: roomId,
      p_guest_id: guestId,
  });
  if (error) mapRpcError(error.message ?? "");
}

export async function updateSsPlayerEmoji(
  roomId: string,
  guestId: string,
  emoji: string,
): Promise<SsRoomProjection> {
  const db = createAdminClient();
  const { error } = await (db.rpc as any)("update_ss_player_emoji", {
    p_room_id: roomId,
    p_guest_id: guestId,
    p_emoji: emoji,
  });
  if (error) mapRpcError(error.message ?? "");
  return getSsRoom(roomId, guestId);
}

export async function startSsGame(roomId: string, guestId: string): Promise<SsRoomProjection> {
  const db = createAdminClient();
  const room = await fetchRoomRow(roomId);

  const result = await fetchQuestions({
    count: 40,
    category: room.category,
    token: room.question_token || "",
    seenIds: [],
  });

  if (result.error || !result.questions.length) {
    throw new AppError(
      "INVALID_INPUT",
      result.error ?? "Failed to load trivia questions for this game",
    );
  }

  const questions = await enrichQuestionsWithTopics(
    result.questions,
    room.category,
  );

  const slMap = generateSlMap();
  const seenIds = questions.map((q) => q.id).filter(Boolean);

  const { error } = await (db.rpc as any)("start_ss_game", {
      p_room_id: roomId,
      p_host_guest_id: guestId,
      p_sl_map: slMap,
      p_question_pool: questions,
      p_question_token: result.token,
      p_seen_question_ids: seenIds,
  });

  if (error) mapRpcError(error.message ?? "");

  return getSsRoom(roomId, guestId);
}

export async function submitSsWager(
  roomId: string,
  guestId: string,
  wager: number,
  turnSeq: number,
): Promise<SsRoomProjection> {
  const db = createAdminClient();
  const room = await fetchRoomRow(roomId);

  const picked = pickQuestionFromPool(
    room.question_pool,
    wager,
    room.used_question_indices,
  );

  if (!picked) {
    throw new AppError("INVALID_INPUT", "No questions remaining in the pool");
  }

  const { error } = await (db.rpc as any)("submit_ss_wager", {
      p_room_id: roomId,
      p_guest_id: guestId,
      p_wager: wager,
      p_turn_seq: turnSeq,
      p_question: picked.question,
      p_question_index: picked.index,
  });

  if (error) mapRpcError(error.message ?? "");

  return getSsRoom(roomId, guestId);
}

export async function submitSsAnswer(
  roomId: string,
  guestId: string,
  answerIndex: number | null,
  turnSeq: number,
  timedOut = false,
): Promise<SsRoomProjection> {
  const db = createAdminClient();

  const { error } = await (db.rpc as any)("submit_ss_answer", {
      p_room_id: roomId,
      p_guest_id: guestId,
      p_answer_index: answerIndex,
      p_turn_seq: turnSeq,
      p_timed_out: timedOut,
  });

  if (error) mapRpcError(error.message ?? "");

  return getSsRoom(roomId, guestId);
}
