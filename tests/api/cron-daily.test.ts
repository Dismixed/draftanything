import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/anyguessr/generator", () => ({ generateAll: vi.fn(async () => ({ succeeded: 1, total: 1 })) }));
vi.mock("@/lib/anyguessr/puzzle-service", () => ({ getDailyPuzzle: vi.fn(async () => ({ rounds: [] })) }));
vi.mock("@/lib/ball-knowledge/schedule-service", () => ({ scheduleDailyCategory: vi.fn(async () => null) }));
vi.mock("@/lib/brain-dead/daily-service", () => ({ getDailyQuestions: vi.fn(async () => []) }));
vi.mock("@/lib/chainlink/top-up", () => ({ topUpDailyChains: vi.fn(async () => []) }));
vi.mock("@/lib/freezeframes/generator", () => ({ generatePuzzleBundles: vi.fn(async () => ({ bundlesCreated: 0 })) }));
vi.mock("@/lib/freezeframes/schedule-service", () => ({
  countUnscheduledApproved: vi.fn(async () => 40),
  scheduleDailyPuzzle: vi.fn(async () => null),
}));
vi.mock("@/lib/getting-warmer/schedule-service", () => ({
  countUnusedApproved: vi.fn(async () => 3),
  scheduleDailyPuzzle: vi.fn(async (_db: unknown, date: string) => ({ puzzleId: "p", date, alreadyScheduled: false })),
}));
vi.mock("@/lib/hot-takes/schedule-service", () => ({ scheduleDailyCategory: vi.fn(async () => null) }));

import { GET } from "@/app/api/cron/daily/route";
import { countUnusedApproved } from "@/lib/getting-warmer/schedule-service";
import { scheduleDailyCategory as scheduleHotTakes } from "@/lib/hot-takes/schedule-service";

const run = () => GET(new Request("https://example.test/api/cron/daily", { headers: { authorization: "Bearer secret" } }));

describe("GET /api/cron/daily", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "secret");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("refuses a request without the cron secret", async () => {
    const res = await GET(new Request("https://example.test/api/cron/daily"));
    expect(res.status).toBe(401);
  });

  it("reports how many unused Getting Warmer puzzles remain and flags a low queue", async () => {
    const body = await (await run()).json();

    expect(body.report["getting-warmer"]).toMatchObject({
      ok: true,
      result: { unusedDays: 3, low: true },
    });
    expect(body.report["getting-warmer"].result.today.puzzleId).toBe("p");
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("getting-warmer has 3 unused"));
  });

  it("counts unused puzzles through tomorrow, after tomorrow has been scheduled", async () => {
    await run();
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    expect(countUnusedApproved).toHaveBeenCalledWith(expect.anything(), tomorrow);
  });

  it("still reports Getting Warmer when another game's job fails", async () => {
    vi.mocked(scheduleHotTakes).mockRejectedValueOnce(new Error("hot takes is down"));

    const res = await run();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.report["hot-takes"]).toEqual({ ok: false, error: "hot takes is down" });
    expect(body.report["getting-warmer"].ok).toBe(true);
  });
});
