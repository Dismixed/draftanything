import { describe, expect, it } from "vitest";
import { DAILY_GAMES, type DailyGameId } from "@/lib/games/registry";
import { isSweep, sweepCount } from "@/lib/streak/sweep";
import type { StreakStore } from "@/lib/streak/types";

function store(dates: Partial<Record<DailyGameId, string[]>>): StreakStore {
  return {
    version: 1,
    games: Object.fromEntries(DAILY_GAMES.map((id) => [id, { playDates: dates[id] ?? [] }])) as StreakStore["games"],
  };
}

const everyGame = (dates: string[]) => Object.fromEntries(DAILY_GAMES.map((id) => [id, dates]));

describe("isSweep", () => {
  it("is true only when all seven games were played on that date", () => {
    expect(isSweep(store(everyGame(["2026-10-10"])), "2026-10-10")).toBe(true);
    expect(isSweep(store({ ...everyGame(["2026-10-10"]), "hot-takes": [] }), "2026-10-10")).toBe(false);
    expect(isSweep(store(everyGame(["2026-10-10"])), "2026-10-11")).toBe(false);
  });

  it("is false for an empty store", () => {
    expect(isSweep(store({}), "2026-10-10")).toBe(false);
  });
});

describe("sweepCount", () => {
  it("counts the dates on which all seven were played", () => {
    const dates = { ...everyGame(["2026-10-08", "2026-10-09", "2026-10-10"]), chainlink: ["2026-10-08", "2026-10-10"] };
    expect(sweepCount(store(dates))).toBe(2);
  });

  it("counts a date once even if it was stored twice", () => {
    expect(sweepCount(store(everyGame(["2026-10-10", "2026-10-10"])))).toBe(1);
  });

  it("is zero for an empty store", () => {
    expect(sweepCount(store({}))).toBe(0);
  });
});
