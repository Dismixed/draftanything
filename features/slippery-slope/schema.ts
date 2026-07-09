import { z } from "zod";
import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  displayNameSchema,
} from "@/features/room/schema";

export { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, displayNameSchema };

export const SS_CATEGORIES = [
  "general",
  "sports",
  "movies",
  "music",
  "arts",
  "science",
  "history",
  "food",
  "culture",
  "geography",
] as const;

export const createSsRoomSchema = z.object({
  displayName: displayNameSchema,
  category: z.enum(SS_CATEGORIES).default("general"),
  maxPlayers: z.number().int().min(2).max(6),
});

export type CreateSsRoomInput = z.infer<typeof createSsRoomSchema>;

export const joinSsRoomSchema = z.object({
  displayName: displayNameSchema,
});

export type JoinSsRoomInput = z.infer<typeof joinSsRoomSchema>;

export const submitWagerSchema = z.object({
  wager: z.number().int().min(1).max(10),
  turnSeq: z.number().int().min(0),
});

export const submitAnswerSchema = z.object({
  answerIndex: z.number().int().min(0).max(3).nullable(),
  turnSeq: z.number().int().min(0),
  timedOut: z.boolean().optional().default(false),
});

export const updateSsPlayerEmojiSchema = z.object({
  emoji: z.string().min(1).max(8),
});

export interface SsPlayerProjection {
  id: string;
  displayName: string;
  seat: number;
  colorIndex: number;
  emoji: string;
  position: number;
  isHost: boolean;
}

export interface SsQuestionProjection {
  q: string;
  a: string[];
  d: number;
  cat: string;
  topic?: string;
  /** Correct index — only exposed after answer resolves */
  c?: number;
}

export interface SsLastEvent {
  type: "turn_result";
  playerId: string;
  playerName: string;
  outcome: "correct" | "wrong" | "timeout";
  from: number;
  to: number;
  final: number;
  wager: number;
  correctIndex: number;
  answerIndex: number | null;
  slDest: number | null;
}

export interface SsRoomProjection {
  roomId: string;
  roomCode: string;
  category: string;
  maxPlayers: number;
  phase: "LOBBY" | "PLAYING" | "WIN";
  turnPhase: "WAGER" | "QUESTION" | null;
  currentSeat: number | null;
  currentWager: number | null;
  currentQuestion: SsQuestionProjection | null;
  /** Specific sub-topic hint during wager phase (category-specific games). */
  wagerTopicHint: string | null;
  slMap: Record<string, number>;
  winnerPlayerId: string | null;
  lastEvent: SsLastEvent | null;
  turnDeadline: string | null;
  turnSeq: number;
  players: SsPlayerProjection[];
  hostPlayerId: string;
  myGuestId?: string;
  serverNow: string;
}
