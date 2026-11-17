import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The legacy lists are merged once per page load, so each test loads the module afresh.
async function loadStorage() {
  vi.resetModules();
  return import("@/lib/streak/storage");
}

describe("streak dates kept by a game before the shared streaks", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("carries Dead Reckoning's own finished days into its streak", async () => {
    localStorage.setItem("dead-reckoning:v1:finished", JSON.stringify(["2026-11-15", "2026-11-16"]));
    const { getGameStreak, readStreakStore } = await loadStorage();

    expect(readStreakStore().games["dead-reckoning"].playDates).toEqual(["2026-11-15", "2026-11-16"]);
    expect(getGameStreak("dead-reckoning", "2026-11-17").currentStreak).toBe(2);
  });

  it("adds them without repeating a day already in the shared store", async () => {
    localStorage.setItem("dead-reckoning:v1:finished", JSON.stringify(["2026-11-16", "not a date", 7]));
    localStorage.setItem(
      "stim_daily_streaks",
      JSON.stringify({ version: 1, games: { "dead-reckoning": { playDates: ["2026-11-16", "2026-11-17"] } } }),
    );
    const { readStreakStore } = await loadStorage();

    expect(readStreakStore().games["dead-reckoning"].playDates).toEqual(["2026-11-16", "2026-11-17"]);
  });

  it("still reads Brain Dead's old stats", async () => {
    localStorage.setItem("bd_personal_stats", JSON.stringify({ playDates: ["2026-11-16"] }));
    const { readStreakStore } = await loadStorage();

    expect(readStreakStore().games["brain-dead"].playDates).toEqual(["2026-11-16"]);
  });
});
