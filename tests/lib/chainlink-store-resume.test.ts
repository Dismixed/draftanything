import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function saveGame(date: string) {
  localStorage.setItem(
    "chainlink-v3",
    JSON.stringify({
      state: {
        mode: "daily",
        puzzleId: `daily-${date}`,
        puzzleWords: ["snow", "ball", "park", "bench"],
        date,
        currentWordIndex: 2,
        wordStatuses: ["solved", "solved", "active", "locked"],
        wordAttempts: [[], ["ball"], [], []],
        revealedLetters: [[], [], [], []],
        hintsRemaining: 3,
        gameStatus: "playing",
        startTime: 1,
      },
      version: 0,
    }),
  );
}

describe("Chain Link saved progress", () => {
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
    const { useChainlinkStore } = await import("@/lib/chainlink/store");

    await useChainlinkStore.getState().initPuzzle();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(useChainlinkStore.getState().currentWordIndex).toBe(2);
  });

  it("does not load a game saved on an earlier day", async () => {
    saveGame("2026-10-08");
    const { useChainlinkStore } = await import("@/lib/chainlink/store");

    expect(useChainlinkStore.getState().puzzleWords).toHaveLength(0);
    expect(useChainlinkStore.getState().puzzleId).toBeNull();
  });
});
