import { describe, it, expect } from "vitest";
import { buildPublicResult } from "./projection";
import type { DraftRoomProjection } from "@/features/draft/types";

function makeProjection(overrides?: Partial<DraftRoomProjection>): DraftRoomProjection {
  return {
    draft: {
      id: "draft-1",
      roomCode: "ABC123",
      topic: "Best TV Shows",
      phase: "COMPLETE",
      hostPlayerId: "player-1",
      maxPlayers: 4,
      rounds: 3,
      draftType: "snake",
      pickingMode: "pool",
      judgingMode: "ai",
      aiPersonality: "analyst",
      customJudgePrompt: null,
      timerSeconds: null,
      completedAt: "2026-06-15T13:30:00Z",
      judgingStartedAt: null,
      pickOrder: [],
      currentPickIndex: 0,
      turnDeadline: null,
      pendingPickId: null,
    },
    players: [
      { id: "player-1", displayName: "Alice", seat: 1, isReady: true, isHost: true },
      { id: "player-2", displayName: "Bob", seat: 2, isReady: true, isHost: false },
    ],
    availableItems: [
      { id: "item-1", name: "Breaking Bad", source: "ai", isAvailable: false },
      { id: "item-2", name: "The Wire", source: "ai", isAvailable: false },
    ],
    picks: [
      { id: "pick-1", playerId: "player-1", itemId: "item-1", itemName: null, overallPick: 1, round: 1, pickInRound: 1, isAutoPick: false, forfeited: false },
      { id: "pick-2", playerId: "player-2", itemId: "item-2", itemName: null, overallPick: 2, round: 1, pickInRound: 2, isAutoPick: false, forfeited: false },
    ],
    commentary: [],
    defenses: [
      { id: "def-1", playerId: "player-1", defenseText: "Best show ever", skipped: false, submittedAt: "2026-06-15T13:00:00Z" },
      { id: "def-2", playerId: "player-2", defenseText: "Deep storytelling", skipped: false, submittedAt: "2026-06-15T13:00:00Z" },
    ],
    votes: [
      { id: "vote-1", voterPlayerId: "player-1", selectedPlayerId: "player-1" },
      { id: "vote-2", voterPlayerId: "player-2", selectedPlayerId: "player-1" },
    ],
    vetoVotes: [],
    judgment: {
      id: "judgment-1",
      source: "ai",
      playerScores: { "player-1": 9, "player-2": 7 },
      ranking: ["player-1", "player-2"],
      winnerPlayerIds: ["player-1"],
      awards: {
        bestPick: { pickId: "pick-1", itemId: "item-1", playerId: "player-1" },
        worstPick: { pickId: "pick-2", itemId: "item-2", playerId: "player-2" },
        biggestSteal: { pickId: "pick-1", itemId: "item-1", playerId: "player-1" },
      },
      explanation: "Alice had the strongest picks overall.",
      model: "gpt-4",
      createdAt: "2026-06-15T13:30:00Z",
    },
    serverNow: "2026-06-15T13:30:01Z",
    ...overrides,
  };
}

describe("buildPublicResult", () => {
  it("includes topic, rosters, ranking, winner, awards, explanation, community totals, completed timestamp", () => {
    const result = buildPublicResult(makeProjection());

    expect(result.topic).toBe("Best TV Shows");
    expect(result.ranking).toHaveLength(2);
    expect(result.winner).not.toBeNull();
    expect(result.winner!.displayName).toBe("Alice");
    expect(result.winner!.score).toBe(9);
    expect(result.awards).toHaveLength(3);
    expect(result.explanation).toBe("Alice had the strongest picks overall.");
    expect(result.communityTotals).toEqual({ "player-1": 2 });
    expect(result.completedAt).toBeTruthy();
    expect(result.rounds).toBe(3);
    expect(result.draftType).toBe("snake");
    expect(result.judgingMode).toBe("ai");
  });

  it("excludes guest IDs, tokens, raw metadata, internal prompts, and rate-limit keys", () => {
    const result = buildPublicResult(makeProjection());
    const json = JSON.stringify(result);

    expect(json).not.toContain("guest_id");
    expect(json).not.toContain("guestId");
    expect(json).not.toContain("hostPlayerId");
    expect(json).not.toContain("host_guest_id");
    expect(json).not.toContain("pickOrder");
    expect(json).not.toContain("pick_order");
    expect(json).not.toContain("currentPickIndex");
    expect(json).not.toContain("turnDeadline");
    expect(json).not.toContain("serverNow");
    expect(json).not.toContain("isAutoPick");
    expect(json).not.toContain("rate-limit");
    expect(json).not.toContain("RATE_LIMITED");
  });

  it("returns null winner and empty awards when judgment is null", () => {
    const result = buildPublicResult(makeProjection({ judgment: null }));
    expect(result.winner).toBeNull();
    expect(result.awards).toHaveLength(0);
    expect(result.ranking.every((p) => p.score === null)).toBe(true);
    expect(result.ranking.every((p) => p.rank === null)).toBe(true);
  });

  it("sorts ranking by rank ascending", () => {
    const proj = makeProjection();
    proj.judgment!.ranking = ["player-2", "player-1"];
    proj.judgment!.playerScores = { "player-1": 9, "player-2": 7 };
    proj.judgment!.winnerPlayerIds = ["player-2"];
    const result = buildPublicResult(proj);
    expect(result.ranking[0].id).toBe("player-2");
    expect(result.ranking[1].id).toBe("player-1");
    expect(result.winner!.id).toBe("player-2");
  });

  it("handles awards with missing references gracefully", () => {
    const proj = makeProjection();
    proj.judgment!.awards = {
      bestPick: { pickId: "nonexistent", itemId: "nonexistent", playerId: "nonexistent" },
    };
    const result = buildPublicResult(proj);
    expect(result.awards).toHaveLength(1);
    expect(result.awards[0].playerName).toBe("Unknown");
    expect(result.awards[0].itemName).toBe("Unknown");
  });

  it("resolves award item names from pickId when itemId is empty (off-the-dome)", () => {
    const proj = makeProjection({
      draft: {
        ...makeProjection().draft,
        pickingMode: "off_the_dome",
      },
      availableItems: [],
      picks: [
        {
          id: "pick-1",
          playerId: "player-1",
          itemId: "",
          itemName: "LeBron James",
          overallPick: 1,
          round: 1,
          pickInRound: 1,
          isAutoPick: false,
          forfeited: false,
        },
      ],
      judgment: {
        ...makeProjection().judgment!,
        awards: {
          bestPick: { pickId: "pick-1", itemId: "", playerId: "player-1" },
          worstPick: { pickId: "pick-1", itemId: "", playerId: "player-1" },
          biggestSteal: { pickId: "pick-1", itemId: "", playerId: "player-1" },
        },
      },
    });

    const result = buildPublicResult(proj);
    expect(result.awards.every((a) => a.itemName === "LeBron James")).toBe(true);
  });

  it("resolves award item names when AI puts the pick name in itemId", () => {
    const proj = makeProjection({
      draft: {
        ...makeProjection().draft,
        pickingMode: "off_the_dome",
      },
      availableItems: [],
      picks: [
        {
          id: "pick-1",
          playerId: "player-1",
          itemId: "",
          itemName: "LeBron James",
          overallPick: 1,
          round: 1,
          pickInRound: 1,
          isAutoPick: false,
          forfeited: false,
        },
      ],
      judgment: {
        ...makeProjection().judgment!,
        awards: {
          bestPick: {
            pickId: "hallucinated-id",
            itemId: "LeBron James",
            playerId: "player-1",
          },
        },
      },
    });

    const result = buildPublicResult(proj);
    expect(result.awards[0].itemName).toBe("LeBron James");
    expect(result.awards[0].playerName).toBe("Alice");
    expect(result.awards[0].pickNumber).toBe(1);
  });

  it("resolves award item names from pickId when itemId is wrong", () => {
    const proj = makeProjection();
    proj.judgment!.awards = {
      bestPick: { pickId: "pick-1", itemId: "wrong-id", playerId: "player-1" },
    };
    const result = buildPublicResult(proj);
    expect(result.awards[0].itemName).toBe("Breaking Bad");
  });
});
