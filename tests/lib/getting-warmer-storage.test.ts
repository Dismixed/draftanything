import { beforeEach, describe, expect, it } from "vitest";
import { getDailyPlayed, saveDailyPlayed } from "@/lib/getting-warmer/storage";
import { getDateString } from "@/lib/streak/date";
import { readStreakStore } from "@/lib/streak/storage";

describe("Getting Warmer saveDailyPlayed", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("counts a solved puzzle as today's play", () => {
    saveDailyPlayed(true, 4, { answer: "LIGHTHOUSE", guesses: ["BOAT", "LIGHTHOUSE"] });

    expect(readStreakStore().games["getting-warmer"].playDates).toEqual([getDateString()]);
    expect(getDailyPlayed()).toMatchObject({ won: true, attempts: 4 });
  });

  it("counts giving up as today's play too, so the puzzle is not offered again as the next game", () => {
    saveDailyPlayed(false, 6, { answer: "LIGHTHOUSE", guesses: ["BOAT"], gaveUp: true });

    expect(readStreakStore().games["getting-warmer"].playDates).toEqual([getDateString()]);
    expect(getDailyPlayed()).toMatchObject({ won: false, gaveUp: true });
  });
});
