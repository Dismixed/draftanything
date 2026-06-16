import { z } from "zod";

// Ambiguity-free alphabet: excludes 0, O, I, l, 1
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 6;

export const displayNameSchema = z
  .string()
  .min(1, "Display name must be at least 1 character")
  .max(30, "Display name must be at most 30 characters")
  .refine(
    (val) => val.trim().length >= 1,
    "Display name must contain at least 1 visible character",
  );

export const createRoomSchema = z.object({
  displayName: displayNameSchema,
  topic: z
    .string()
    .min(2, "Topic must be at least 2 characters")
    .max(80, "Topic must be at most 80 characters"),
  maxPlayers: z
    .number()
    .int()
    .min(2, "Room must allow at least 2 players")
    .max(6, "Room can have at most 6 players"),
  rounds: z
    .number()
    .int()
    .min(1, "Must have at least 1 round")
    .max(10, "Cannot have more than 10 rounds"),
  timerSeconds: z
    .union([
      z.literal(null),
      z.number().int().min(15).max(180),
    ])
    .nullable(),
  draftType: z.enum(["standard", "snake", "random"]),
  judgingMode: z.enum(["ai", "community", "hybrid"]),
  aiPersonality: z.enum(["analyst", "hype", "roast"]),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;

export const joinRoomSchema = z.object({
  displayName: displayNameSchema,
  roomCode: z
    .string()
    .length(ROOM_CODE_LENGTH, `Room code must be exactly ${ROOM_CODE_LENGTH} characters`)
    .regex(/^[A-Z2-9]+$/, "Invalid room code format"),
});

export type JoinRoomInput = z.infer<typeof joinRoomSchema>;

export interface RoomPlayer {
  id: string;
  displayName: string;
  seat: number;
  isReady: boolean;
  isHost: boolean;
}

export interface RoomProjection {
  draftId: string;
  roomCode: string;
  topic: string;
  maxPlayers: number;
  rounds: number;
  timerSeconds: number | null;
  draftType: "standard" | "snake" | "random";
  judgingMode: "ai" | "community" | "hybrid";
  aiPersonality: "analyst" | "hype" | "roast";
  phase: string;
  players: RoomPlayer[];
  hostPlayerId: string;
}
