import { describe, expect, it } from "vitest";
import { DAILY_GAMES, FEATURED_GAMES, PINNED_FEATURED_GAME, PUZZLE_GAMES, type DailyGameId } from "@/lib/games/registry";
import {
  buildTodayView,
  featuredGameForDay,
  formatCountdown,
  msUntilNextDailyDay,
  otherDailies,
  dailyDayNumber,
} from "@/lib/games/today";

const DAY = 20_000;

describe("dailyDayNumber", () => {
  it("changes at midnight US Eastern, not midnight UTC", () => {
    const before = dailyDayNumber(new Date("2026-10-07T03:59:59Z"));
    const after = dailyDayNumber(new Date("2026-10-07T04:00:00Z"));
    expect(after).toBe(before + 1);
    expect(dailyDayNumber(new Date("2026-10-07T00:00:00Z"))).toBe(before);
  });

  it("numbers a day the same as the matching UTC date did, so the rotation carries on", () => {
    expect(dailyDayNumber(new Date("2026-10-07T12:00:00Z"))).toBe(Date.parse("2026-10-07") / 86_400_000);
  });
});

describe("featuredGameForDay", () => {
  it("features Dead Reckoning every day", () => {
    expect(PINNED_FEATURED_GAME).toBe("dead-reckoning");
    for (let i = 0; i < 30; i++) expect(featuredGameForDay(DAY + i)).toBe("dead-reckoning");
    expect(featuredGameForDay(-1)).toBe("dead-reckoning");
  });
});

describe("buildTodayView", () => {
  const pinned = new Set<DailyGameId>([PINNED_FEATURED_GAME]);

  it("features Dead Reckoning with nothing played, and every other puzzle in the lineup", () => {
    const view = buildTodayView(DAY, new Set());
    expect(view.featured).toBe("dead-reckoning");
    expect(view.isUpNext).toBe(false);
    expect(view.doneCount).toBe(0);
    expect(view.lineup).toHaveLength(6);
    expect(view.lineup).not.toContain("dead-reckoning");
    expect(view.lineup).not.toContain("hot-takes");
  });

  it("offers one of the three rotating games next once Dead Reckoning is played", () => {
    const view = buildTodayView(DAY, pinned);
    expect(FEATURED_GAMES).toContain(view.featured);
    expect(view.isUpNext).toBe(true);
    expect(view.doneCount).toBe(1);
  });

  it("rotates which of the three comes next, each once in any three consecutive days", () => {
    const run = Array.from({ length: 3 }, (_, i) => buildTodayView(DAY + i, pinned).featured);
    expect([...run].sort()).toEqual([...FEATURED_GAMES].sort());
    expect(FEATURED_GAMES).toContain(buildTodayView(-15, pinned).featured);
  });

  it("works through the three rotating games before any other daily", () => {
    const first = buildTodayView(DAY, pinned).featured!;
    const view = buildTodayView(DAY, new Set<DailyGameId>([PINNED_FEATURED_GAME, first]));
    expect(FEATURED_GAMES).toContain(view.featured);
    expect(view.featured).not.toBe(first);
  });

  it("moves on to the other dailies once Dead Reckoning and the three are played", () => {
    const view = buildTodayView(DAY, new Set<DailyGameId>([PINNED_FEATURED_GAME, ...FEATURED_GAMES]));
    expect(view.featured).toBe("freezeframes");
    expect(view.isUpNext).toBe(true);
    expect(view.doneCount).toBe(4);
  });

  it("features the last unplayed puzzle, whichever it is", () => {
    const allButOne = new Set<DailyGameId>(DAILY_GAMES.filter((id) => id !== "getting-warmer"));
    const view = buildTodayView(DAY, allButOne);
    expect(view.featured).toBe("getting-warmer");
    expect(view.doneCount).toBe(6);
  });

  it("never features Hot Takes and does not count it as done", () => {
    const view = buildTodayView(DAY, new Set<DailyGameId>([...PUZZLE_GAMES]));
    expect(view.featured).toBeNull();
    expect(view.doneCount).toBe(7);
    expect(buildTodayView(DAY, new Set<DailyGameId>(["hot-takes"])).doneCount).toBe(0);
  });

  it("puts unplayed games before played games in the lineup", () => {
    const playedGame: DailyGameId = "getting-warmer";
    const view = buildTodayView(DAY, new Set<DailyGameId>([playedGame]));
    expect(view.featured).toBe("dead-reckoning");
    expect(view.lineup[view.lineup.length - 1]).toBe(playedGame);
    expect(view.lineup.slice(0, 5)).not.toContain(playedGame);
  });

  it("has no featured game and all seven puzzles in the lineup when everything is played", () => {
    const view = buildTodayView(DAY, new Set<DailyGameId>(DAILY_GAMES));
    expect(view.featured).toBeNull();
    expect(view.isUpNext).toBe(false);
    expect(view.doneCount).toBe(7);
    expect(view.lineup).toEqual([...PUZZLE_GAMES]);
  });
});

describe("countdown", () => {
  it("measures the time to the next Eastern midnight (EDT, 04:00 UTC)", () => {
    const now = Date.parse("2026-10-06T15:23:00Z");
    expect(msUntilNextDailyDay(now)).toBe((12 * 60 + 37) * 60 * 1000);
  });

  it("uses EST (05:00 UTC) in winter", () => {
    const now = Date.parse("2026-12-01T05:00:00Z");
    expect(msUntilNextDailyDay(now)).toBe(24 * 60 * 60 * 1000);
  });

  it("is right across the nights the clocks change", () => {
    // Clocks go back on Nov 1, 2026: the Nov 1 day is 25 hours long.
    expect(msUntilNextDailyDay(Date.parse("2026-11-01T04:00:00Z"))).toBe(25 * 60 * 60 * 1000);
    // Clocks go forward on Mar 8, 2026: the Mar 8 day is 23 hours long.
    expect(msUntilNextDailyDay(Date.parse("2026-03-08T05:00:00Z"))).toBe(23 * 60 * 60 * 1000);
  });

  it("formats hours and minutes", () => {
    expect(formatCountdown((8 * 60 + 37) * 60 * 1000)).toBe("8h 37m");
    expect(formatCountdown(59 * 1000)).toBe("0h 1m");
    expect(formatCountdown(0)).toBe("0h 0m");
  });
});

describe("otherDailies", () => {
  it("returns three other puzzles and never the game itself or Hot Takes", () => {
    for (const id of DAILY_GAMES) {
      const others = otherDailies(id);
      expect(others).toHaveLength(3);
      expect(others).not.toContain(id);
      expect(others).not.toContain("hot-takes");
    }
  });

  it("returns puzzles for a party game", () => {
    expect(otherDailies("draft-anything")).toEqual(PUZZLE_GAMES.slice(0, 3));
  });
});
