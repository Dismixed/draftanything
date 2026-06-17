import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock server-only modules
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("@/features/ai/judge", () => ({
  judgeRosters: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { judgeRosters } from "@/features/ai/judge";
import type { SafePick } from "@/features/draft/types";

const mockQueryChain = {
  select: vi.fn(),
  eq: vi.fn(),
};

const mockDb = {
  from: vi.fn(),
};

mockQueryChain.select.mockReturnValue(mockQueryChain);
mockQueryChain.eq.mockReturnValue(Promise.resolve({ data: [], error: null }));

vi.mocked(createAdminClient).mockReturnValue(mockDb as unknown as ReturnType<typeof createAdminClient>);

describe("judging service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("persistJudgment", () => {
    it("should persist a judgment record", async () => {
      const { persistJudgment } = await import("./service");

      const insert = vi.fn().mockReturnValue({ error: null });
      mockDb.from.mockReturnValue({ insert });

      await persistJudgment({
        draftId: "draft-1",
        source: "ai",
        playerScores: {
          p1: { overall: 8, categories: {} },
          p2: { overall: 6, categories: {} },
        },
        ranking: ["p1", "p2"],
        winnerPlayerIds: ["p1"],
        awards: {
          bestPick: { pickId: "pk1", itemId: "it1", playerId: "p1" },
          worstPick: { pickId: "pk2", itemId: "it2", playerId: "p2" },
          biggestSteal: { pickId: "pk3", itemId: "it3", playerId: "p1" },
        },
        explanation: "Test judgment.",
        model: "gpt-4o",
        promptVersion: "1.0.0",
        idempotencyKey: "test-key",
      });

      expect(mockDb.from).toHaveBeenCalledWith("judgments");
      expect(insert).toHaveBeenCalledWith({
        draft_id: "draft-1",
        source: "ai",
        player_scores: { p1: 8, p2: 6 },
        ranking: ["p1", "p2"],
        winner_player_ids: ["p1"],
        awards: {
          bestPick: { pickId: "pk1", itemId: "it1", playerId: "p1" },
          worstPick: { pickId: "pk2", itemId: "it2", playerId: "p2" },
          biggestSteal: { pickId: "pk3", itemId: "it3", playerId: "p1" },
        },
        explanation: "Test judgment.",
        model: "gpt-4o",
        prompt_version: "1.0.0",
        idempotency_key: "test-key",
      });
    });
  });

  describe("judgeCommunityMode", () => {
    it("should compute community-based judgment from votes", async () => {
      const { judgeDraft } = await import("./service");

      const players = [
        { id: "p1", displayName: "Alice", seat: 1, isReady: false, isHost: true },
        { id: "p2", displayName: "Bob", seat: 2, isReady: false, isHost: false },
        { id: "p3", displayName: "Charlie", seat: 3, isReady: false, isHost: false },
      ];

      const picks: SafePick[] = [];

      const rosters = [
        { pickIds: [], playerId: "p1", itemIds: [], displayName: "Alice" },
        { pickIds: [], playerId: "p2", itemIds: [], displayName: "Bob" },
        { pickIds: [], playerId: "p3", itemIds: [], displayName: "Charlie" },
      ];

      const votes = [
        { voterPlayerId: "p1", selectedPlayerId: "p2" },
        { voterPlayerId: "p2", selectedPlayerId: "p1" },
        { voterPlayerId: "p3", selectedPlayerId: "p2" },
      ];

      const result = await judgeDraft(
        "draft-1",
        "Test",
        "community",
        "analyst",
        null,
        [],
        players,
        picks,
        rosters,
        votes,
      );

      expect(result.source).toBe("fallback");
      // p2 got 2 of 3 votes: 2/3 * 10 = 6.67
      expect(result.winnerPlayerIds).toEqual(["p2"]);
      expect(result.playerScores.p2.overall).toBeCloseTo(6.67, 1);
    });
  });

  describe("judgeAiMode", () => {
    it("should call AI judge and return result", async () => {
      const { judgeDraft } = await import("./service");

      const aiResult = {
        source: "ai" as const,
        playerScores: {
          p1: { overall: 8, categories: {} },
          p2: { overall: 6, categories: {} },
        },
        ranking: ["p1", "p2"],
        winnerPlayerIds: ["p1"],
        awards: {
          bestPick: { pickId: "pk1", itemId: "it1", playerId: "p1" },
          worstPick: { pickId: "pk2", itemId: "it2", playerId: "p2" },
          biggestSteal: { pickId: "pk3", itemId: "it3", playerId: "p1" },
        },
        explanation: "AI evaluation.",
        model: "gpt-4o",
        promptVersion: "1.0.0",
        idempotencyKey: "ai-key",
      };

      vi.mocked(judgeRosters).mockResolvedValue(aiResult);

      mockDb.from.mockReturnValue(mockQueryChain);

      const players = [{ id: "p1", displayName: "Alice", seat: 1, isReady: false, isHost: true }];
      const picks: SafePick[] = [];
      const rosters = [{ pickIds: [], playerId: "p1", itemIds: [], displayName: "Alice" }];

      const result = await judgeDraft(
        "draft-1",
        "Test",
        "ai",
        "analyst",
        null,
        [],
        players,
        picks,
        rosters,
        [],
      );

      expect(result.source).toBe("ai");
      expect(result.winnerPlayerIds).toEqual(["p1"]);
    });
  });

  describe("judgeHybridMode", () => {
    it("should combine AI and community scores with 70/30 weighting", async () => {
      const { judgeDraft } = await import("./service");

      const aiResult = {
        source: "ai" as const,
        playerScores: {
          p1: { overall: 8, categories: { creativity: 8 } },
          p2: { overall: 6, categories: { creativity: 6 } },
        },
        ranking: ["p1", "p2"],
        winnerPlayerIds: ["p1"],
        awards: {
          bestPick: { pickId: "pk1", itemId: "it1", playerId: "p1" },
          worstPick: { pickId: "pk2", itemId: "it2", playerId: "p2" },
          biggestSteal: { pickId: "pk3", itemId: "it3", playerId: "p1" },
        },
        explanation: "Hybrid evaluation.",
        model: "gpt-4o",
        promptVersion: "1.0.0",
        idempotencyKey: "hybrid-key",
      };

      vi.mocked(judgeRosters).mockResolvedValue(aiResult);

      mockDb.from.mockReturnValue(mockQueryChain);

      const players = [
        { id: "p1", displayName: "Alice", seat: 1, isReady: false, isHost: true },
        { id: "p2", displayName: "Bob", seat: 2, isReady: false, isHost: false },
      ];

      const picks: SafePick[] = [];
      const rosters = [
        { pickIds: [], playerId: "p1", itemIds: [], displayName: "Alice" },
        { pickIds: [], playerId: "p2", itemIds: [], displayName: "Bob" },
      ];

      const votes = [
        { voterPlayerId: "p1", selectedPlayerId: "p2" },
      ];

      const result = await judgeDraft(
        "draft-1",
        "Test",
        "hybrid",
        "analyst",
        null,
        [],
        players,
        picks,
        rosters,
        votes,
      );

      expect(result.source).toBe("ai");
      // 70% AI + 30% community
      // p1 voted for p2, so p2 gets 1/1 * 10 = 10 community score
      // p1: 8*0.7 + 0*0.3 = 5.6
      // p2: 6*0.7 + 10*0.3 = 7.2
      expect(result.winnerPlayerIds).toEqual(["p2"]);
    });
  });
});
