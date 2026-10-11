import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}));
vi.mock("@/features/guest/session", () => ({
  ensureGuestSession: vi.fn(async () => ({ guestId: "g1" })),
  requireGuestSession: vi.fn(async () => ({ guestId: "g1" })),
}));
vi.mock("@/lib/games/daily-finish-service", () => ({
  scoreBounds: vi.fn(async (_db: unknown, game: string) =>
    game === "getting-warmer" ? { min: 1, max: 500 } : { min: 0, max: 4000 },
  ),
  recordFinish: vi.fn(async (_db: unknown, _game: string, _date: string, score: number) => score),
  findOwnScore: vi.fn(async () => null),
  dayCounts: vi.fn(async () => ({ total: 3, worse: 1 })),
}));

import { GET, POST } from "@/app/api/daily-finish/route";
import { requireGuestSession } from "@/features/guest/session";
import { dayCounts, findOwnScore, recordFinish } from "@/lib/games/daily-finish-service";
import { estimatedPercentile } from "@/lib/games/percentile";
import { _resetRateLimitStore } from "@/lib/rate-limit";

const post = (body: unknown) =>
  POST(
    new Request("https://example.test/api/daily-finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
const get = (query: string) => GET(new Request(`https://example.test/api/daily-finish${query}`));

describe("/api/daily-finish", () => {
  beforeEach(() => {
    _resetRateLimitStore();
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST", () => {
    it("records the finish and answers with an estimate while few have played", async () => {
      const res = await post({ game: "freezeframes", score: 2200 });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        percentile: estimatedPercentile("freezeframes", 2200, 4000),
        source: "estimated",
        sample: 3,
        max: 4000,
      });
      expect(recordFinish).toHaveBeenCalledWith(expect.anything(), "freezeframes", expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), 2200, {
        userId: null,
        guestId: "g1",
      });
    });

    it("answers for the stored score when the player had already finished today", async () => {
      vi.mocked(recordFinish).mockResolvedValueOnce(900);

      const res = await post({ game: "freezeframes", score: 4000 });
      const body = await res.json();

      expect(dayCounts).toHaveBeenCalledWith(expect.anything(), "freezeframes", expect.any(String), 900, "higher");
      expect(body.percentile).toBe(estimatedPercentile("freezeframes", 900, 4000));
    });

    it("measures against the other players once thirty have finished", async () => {
      vi.mocked(dayCounts).mockResolvedValueOnce({ total: 41, worse: 30 });

      const body = await (await post({ game: "freezeframes", score: 2200 })).json();

      expect(body).toMatchObject({ percentile: 75, source: "measured", sample: 41 });
    });

    it("asks for players who needed more guesses in Getting Warmer", async () => {
      await post({ game: "getting-warmer", score: 6 });
      expect(dayCounts).toHaveBeenCalledWith(expect.anything(), "getting-warmer", expect.any(String), 6, "lower");
    });

    it.each([
      ["a game that is not competitive", { game: "chainlink", score: 3 }],
      ["a missing score", { game: "freezeframes" }],
      ["a score that is not a whole number", { game: "freezeframes", score: 12.5 }],
      ["a negative score", { game: "freezeframes", score: -1 }],
      ["a score above the game's maximum", { game: "freezeframes", score: 4001 }],
      ["zero guesses in Getting Warmer", { game: "getting-warmer", score: 0 }],
      ["a body that is not JSON", "not json"],
    ])("refuses %s", async (_name, body) => {
      const res = await post(body);

      expect(res.status).toBe(400);
      expect(recordFinish).not.toHaveBeenCalled();
    });

    it("answers 503 when the table cannot be read", async () => {
      vi.mocked(recordFinish).mockRejectedValueOnce(new Error('relation "daily_finishes" does not exist'));

      const res = await post({ game: "freezeframes", score: 2200 });

      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: "UNAVAILABLE" });
    });
  });

  describe("GET", () => {
    it("answers without recording anything", async () => {
      const res = await get("?game=freezeframes&score=2200");

      expect(res.status).toBe(200);
      expect((await res.json()).percentile).toBe(estimatedPercentile("freezeframes", 2200, 4000));
      expect(recordFinish).not.toHaveBeenCalled();
    });

    it("leaves the player out of the crowd only when their finish is stored", async () => {
      vi.mocked(dayCounts).mockResolvedValueOnce({ total: 31, worse: 15 });
      vi.mocked(findOwnScore).mockResolvedValueOnce(2200);
      expect((await (await get("?game=freezeframes&score=2200")).json()).percentile).toBe(50);

      vi.mocked(dayCounts).mockResolvedValueOnce({ total: 31, worse: 15 });
      vi.mocked(findOwnScore).mockResolvedValueOnce(null);
      expect((await (await get("?game=freezeframes&score=2200")).json()).percentile).toBe(48);
    });

    it("works for a visitor with no guest session, without creating one", async () => {
      vi.mocked(requireGuestSession).mockRejectedValueOnce(new Error("No guest session found"));

      const res = await get("?game=anyguessr&score=400");

      expect(res.status).toBe(200);
      expect(findOwnScore).toHaveBeenCalledWith(expect.anything(), "anyguessr", expect.any(String), { userId: null, guestId: null });
    });

    it.each(["", "?game=freezeframes", "?game=freezeframes&score=", "?game=freezeframes&score=abc", "?game=hot-takes&score=5", "?game=freezeframes&score=9999"])(
      "refuses %s",
      async (query) => {
        expect((await get(query)).status).toBe(400);
      },
    );
  });
});
