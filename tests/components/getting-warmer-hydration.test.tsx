import { renderToString } from "react-dom/server";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GettingWarmerGame from "@/components/getting-warmer/game";
import { getDateString } from "@/lib/getting-warmer/game-logic";

vi.mock("@/lib/motion/use-reduced-motion", () => ({ useReducedMotion: () => true }));
vi.mock("@/lib/games/use-daily-percentile", () => ({ finishCurve: () => null, useDailyPercentile: () => null }));
vi.mock("@/components/daily/finish-screen", () => ({ FinishScreen: () => null }));
vi.mock("@/lib/getting-warmer/storage", () => ({
  fetchTodayLeaderboard: vi.fn().mockResolvedValue([]),
  getDailyPlayed: vi.fn(),
  getSubmittedEntryId: () => null,
  saveDailyPlayed: vi.fn(),
  saveLeaderboardEntry: vi.fn(),
}));
import { getDailyPlayed } from "@/lib/getting-warmer/storage";

const puzzle = { date: getDateString(), dayNumber: 1, initialClues: ["It bounces"], authoredClueCount: 6 };

describe("Getting Warmer cached visits", () => {
  beforeEach(() => {
    sessionStorage.setItem(`daily-puzzle:getting-warmer:${getDateString()}`, JSON.stringify(puzzle));
    vi.mocked(getDailyPlayed).mockReturnValue(null);
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ nextClue: "It is orange" }) })));
  });
  afterEach(() => { cleanup(); sessionStorage.clear(); vi.unstubAllGlobals(); });

  it.each([false, true])("renders the pending intro before hydration even when finished=%s", (finished) => {
    if (finished) vi.mocked(getDailyPlayed).mockReturnValue({ won: true, attempts: 2, answer: "BASKETBALL", ts: 1 });
    const html = renderToString(<GettingWarmerGame />);
    expect(html).toContain("data-intro-pending");
    expect(html).not.toContain("BASKETBALL");
  });

  it("restores a cached completed result after mount without fetching the puzzle", async () => {
    vi.mocked(getDailyPlayed).mockReturnValue({ won: true, attempts: 2, answer: "BASKETBALL", ts: 1 });
    render(<GettingWarmerGame />);
    expect(await screen.findByText("ALREADY PLAYED TODAY")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start guessing" })).not.toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url) === "/api/getting-warmer/daily")).toBe(false);
  });
});
