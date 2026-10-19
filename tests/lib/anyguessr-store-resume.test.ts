import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_VERSION } from "@/lib/anyguessr/types";

const round = { roundIndex: 0, puzzleId: "p1", clueType: "flag", clue: { type: "flag", content: "" } };
const result = { roundIndex: 0, clueType: "flag", puzzleId: "p1", guess: "Chad", answer: "Chad", distanceKm: 0, roundScore: 100, exact: true };

function saveGame(date: string) {
  localStorage.setItem(
    STORAGE_VERSION,
    JSON.stringify({
      state: { mode: "daily", puzzleId: `daily-${date}`, date, status: "playing", dailyRounds: [round, { ...round, roundIndex: 1, puzzleId: "p2" }], currentRound: 1, roundResults: [result], totalScore: 100, roundRecap: null },
      version: 0,
    }),
  );
}

describe("AnyGuessr saved progress", () => {
  const originalTz = process.env.TZ;

  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    sessionStorage.clear();
    // Evening of the 8th in Los Angeles, already the 9th in US Eastern time, which is the day the server deals.
    process.env.TZ = "America/Los_Angeles";
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-09T05:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    process.env.TZ = originalTz;
  });

  it("keeps today's game when the player's local date is behind the server's", async () => {
    saveGame("2026-10-09");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { useAnyGuessrStore } = await import("@/lib/anyguessr/store");

    await useAnyGuessrStore.getState().initPuzzle();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(useAnyGuessrStore.getState().roundResults).toHaveLength(1);
    expect(useAnyGuessrStore.getState().totalScore).toBe(100);
  });

  it("does not load a game saved on an earlier day, so its stamps never show while today's loads", async () => {
    saveGame("2026-10-08");
    const { useAnyGuessrStore } = await import("@/lib/anyguessr/store");

    expect(useAnyGuessrStore.getState().dailyRounds).toHaveLength(0);
    expect(useAnyGuessrStore.getState().roundResults).toHaveLength(0);
    expect(useAnyGuessrStore.getState().totalScore).toBe(0);
  });
});
