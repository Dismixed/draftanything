import { describe, expect, it } from "vitest";
import { DAILY_GAMES, type DailyGameId } from "@/lib/games/registry";
import { SWEEP_SINCE, isSweep, sweepCount, sweepPuzzles } from "@/lib/streak/sweep";
import type { StreakStore } from "@/lib/streak/types";

function store(dates: Partial<Record<DailyGameId, string[]>>): StreakStore {
  return {
    version: 1,
    games: Object.fromEntries(DAILY_GAMES.map((id) => [id, { playDates: dates[id] ?? [] }])) as StreakStore["games"],
  };
}

const everyGame = (dates: string[]) => Object.fromEntries(DAILY_GAMES.map((id) => [id, dates]));

describe("isSweep", () => {
  it("is true only when every puzzle was played on that date", () => {
    expect(isSweep(store(everyGame(["2026-10-10"])), "2026-10-10")).toBe(true);
    expect(isSweep(store({ ...everyGame(["2026-10-10"]), chainlink: [] }), "2026-10-10")).toBe(false);
    expect(isSweep(store(everyGame(["2026-10-10"])), "2026-10-11")).toBe(false);
  });

  it("does not need Hot Takes, and Hot Takes alone does not make up for a missing puzzle", () => {
    expect(isSweep(store({ ...everyGame(["2026-10-10"]), "hot-takes": [] }), "2026-10-10")).toBe(true);
    expect(isSweep(store({ ...everyGame(["2026-10-10"]), "getting-warmer": [] }), "2026-10-10")).toBe(false);
  });

  it("is false for an empty store", () => {
    expect(isSweep(store({}), "2026-10-10")).toBe(false);
  });
});

describe("sweepCount", () => {
  it("counts the dates on which every puzzle was played", () => {
    const dates = { ...everyGame(["2026-10-08", "2026-10-09", "2026-10-10"]), chainlink: ["2026-10-08", "2026-10-10"] };
    expect(sweepCount(store(dates))).toBe(2);
  });

  it("counts a date once even if it was stored twice", () => {
    expect(sweepCount(store(everyGame(["2026-10-10", "2026-10-10"])))).toBe(1);
  });

  it("counts a date with every puzzle but no Hot Takes", () => {
    expect(sweepCount(store({ ...everyGame(["2026-10-10"]), "hot-takes": [] }))).toBe(1);
  });

  it("is zero for an empty store", () => {
    expect(sweepCount(store({}))).toBe(0);
  });

  it("keeps Sweeps from before Dead Reckoning joined, without it", () => {
    const before = "2026-11-10";
    const after = "2026-11-20";
    const withoutDr = Object.fromEntries(
      DAILY_GAMES.filter((id) => id !== "dead-reckoning").map((id) => [id, [before, after]]),
    );
    // Before it joined, the other six were enough; after, it is needed too.
    expect(sweepCount(store(withoutDr))).toBe(1);
    expect(sweepCount(store({ ...withoutDr, "dead-reckoning": [after] }))).toBe(2);
    expect(isSweep(store(withoutDr), before)).toBe(true);
    expect(isSweep(store(withoutDr), after)).toBe(false);
  });

  it("needs Dead Reckoning from the day it joined", () => {
    expect(SWEEP_SINCE["dead-reckoning"]).toBeDefined();
    const day = SWEEP_SINCE["dead-reckoning"]!;
    expect(sweepPuzzles(day)).toContain("dead-reckoning");
    expect(sweepPuzzles("2026-01-01")).not.toContain("dead-reckoning");
  });
});
