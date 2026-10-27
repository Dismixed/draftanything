import { describe, expect, it } from "vitest";
import type { RoomPlayer, RoomProjection } from "@/features/room/schema";
import { draftEventProperties } from "./events";

const player = (seat: number, isBot: boolean): RoomPlayer => ({
  id: `p${seat}`,
  displayName: `Player ${seat}`,
  seat,
  isReady: true,
  isHost: seat === 1,
  isBot,
});

const room: RoomProjection = {
  draftId: "draft-1",
  roomCode: "ABC123",
  topic: "Pizza toppings",
  maxPlayers: 4,
  rounds: 5,
  timerSeconds: null,
  draftType: "snake",
  pickingMode: "pool",
  judgingMode: "ai",
  aiPersonality: "roast",
  customJudgePrompt: null,
  phase: "DRAFTING",
  players: [player(1, false), player(2, false), player(3, true), player(4, true)],
  hostPlayerId: "p1",
};

describe("draftEventProperties", () => {
  it("records the room's setup and splits the seats into people and AI drafters", () => {
    expect(draftEventProperties(room)).toEqual({
      draft_id: "draft-1",
      picking_mode: "pool",
      judging_mode: "ai",
      rounds: 5,
      human_players: 2,
      bots: 2,
    });
  });
});
