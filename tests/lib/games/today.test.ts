import { describe, expect, it } from "vitest";
import { DAILY_GAMES, FEATURED_GAMES, type DailyGameId } from "@/lib/games/registry";
import {
  buildTodayView,
  featuredGameForDay,
  formatCountdown,
  msUntilNextUtcDay,
  otherDailies,
  utcDayNumber,
} from "@/lib/games/today";

const DAY = 20_000;

describe("utcDayNumber", () => {
  it("changes at midnight UTC, not local midnight", () => {
    const before = utcDayNumber(new Date("2026-10-06T23:59:59Z"));
    const after = utcDayNumber(new Date("2026-10-07T00:00:00Z"));
    expect(after).toBe(before + 1);
  });
});

describe("featuredGameForDay", () => {
  it("returns the same game for the same day", () => {
    expect(featuredGameForDay(DAY)).toBe(featuredGameForDay(DAY));
  });

  it("only ever features Chain Link, Brain Dead or AnyGuessr", () => {
    expect([...FEATURED_GAMES]).toEqual(["chainlink", "brain-dead", "anyguessr"]);
    for (let i = 0; i < 30; i++) expect(FEATURED_GAMES).toContain(featuredGameForDay(DAY + i));
  });

  it("features each of the three once in any three consecutive days", () => {
    const run = Array.from({ length: 3 }, (_, i) => featuredGameForDay(DAY + i));
    expect([...run].sort()).toEqual([...FEATURED_GAMES].sort());
  });

  it("returns a valid game for negative day numbers", () => {
    expect(FEATURED_GAMES).toContain(featuredGameForDay(-1));
    expect(FEATURED_GAMES).toContain(featuredGameForDay(-15));
  });
});

describe("buildTodayView", () => {
  const featured = featuredGameForDay(DAY);

  it("features the day's game with nothing played", () => {
    const view = buildTodayView(DAY, new Set());
    expect(view.featured).toBe(featured);
    expect(view.isUpNext).toBe(false);
    expect(view.doneCount).toBe(0);
    expect(view.lineup).toHaveLength(6);
    expect(view.lineup).not.toContain(featured);
  });

  it("moves to the next unplayed game once the featured one is played", () => {
    const view = buildTodayView(DAY, new Set<DailyGameId>([featured]));
    expect(view.featured).toBe(featuredGameForDay(DAY + 1));
    expect(view.isUpNext).toBe(true);
    expect(view.doneCount).toBe(1);
  });

  it("works through the three featured games before any other daily", () => {
    const view = buildTodayView(DAY, new Set<DailyGameId>([featured, featuredGameForDay(DAY + 1)]));
    expect(view.featured).toBe(featuredGameForDay(DAY + 2));
    expect(view.isUpNext).toBe(true);
  });

  it("moves on to the other dailies once all three featured games are played", () => {
    const view = buildTodayView(DAY, new Set<DailyGameId>(FEATURED_GAMES));
    expect(view.featured).toBe("freezeframes");
    expect(view.isUpNext).toBe(true);
    expect(view.doneCount).toBe(3);
  });

  it("features the last unplayed daily, whichever it is", () => {
    const allButOne = new Set<DailyGameId>(DAILY_GAMES.filter((id) => id !== "getting-warmer"));
    const view = buildTodayView(DAY, allButOne);
    expect(view.featured).toBe("getting-warmer");
    expect(view.doneCount).toBe(6);
  });

  it("puts unplayed games before played games in the lineup", () => {
    const playedGame: DailyGameId = "hot-takes";
    const view = buildTodayView(DAY, new Set<DailyGameId>([playedGame]));
    expect(view.featured).toBe(featured);
    expect(view.lineup[view.lineup.length - 1]).toBe(playedGame);
    expect(view.lineup.slice(0, 5)).not.toContain(playedGame);
  });

  it("has no featured game and all seven in the lineup when everything is played", () => {
    const view = buildTodayView(DAY, new Set<DailyGameId>(DAILY_GAMES));
    expect(view.featured).toBeNull();
    expect(view.isUpNext).toBe(false);
    expect(view.doneCount).toBe(7);
    expect(view.lineup).toHaveLength(7);
  });
});

describe("countdown", () => {
  it("measures the time to the next UTC midnight", () => {
    const now = Date.parse("2026-10-06T15:23:00Z");
    expect(msUntilNextUtcDay(now)).toBe((8 * 60 + 37) * 60 * 1000);
  });

  it("formats hours and minutes", () => {
    expect(formatCountdown((8 * 60 + 37) * 60 * 1000)).toBe("8h 37m");
    expect(formatCountdown(59 * 1000)).toBe("0h 1m");
    expect(formatCountdown(0)).toBe("0h 0m");
  });
});

describe("otherDailies", () => {
  it("returns three other dailies and never the game itself", () => {
    for (const id of DAILY_GAMES) {
      const others = otherDailies(id);
      expect(others).toHaveLength(3);
      expect(others).not.toContain(id);
    }
  });

  it("returns dailies for a party game", () => {
    expect(otherDailies("draft-anything")).toEqual(DAILY_GAMES.slice(0, 3));
  });
});
