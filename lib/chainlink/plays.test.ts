import { describe, expect, it } from "vitest";
import { countedDailyIds, parseAttempt } from "./plays";

describe("parseAttempt", () => {
  const id = "98613b54-3d45-40db-b404-8910ffab4b74";

  it("accepts a well-formed attempt", () => {
    expect(parseAttempt({ puzzleId: id, mode: "daily", completed: true })).toEqual({
      puzzleId: id,
      mode: "daily",
      completed: true,
    });
  });

  it("rejects an unknown mode, a non-uuid puzzle id or a missing result", () => {
    expect(parseAttempt({ puzzleId: id, mode: "weekly", completed: true })).toBeNull();
    expect(parseAttempt({ puzzleId: "daily-2026-10-08", mode: "daily", completed: true })).toBeNull();
    expect(parseAttempt({ puzzleId: id, mode: "daily" })).toBeNull();
    expect(parseAttempt(null)).toBeNull();
  });
});

describe("countedDailyIds", () => {
  const options = { today: "2026-10-20", trackingSince: "2026-10-08" };
  const daily = (puzzle_id: string, publish_date: string) => ({ puzzle_id, publish_date });

  it("counts a past daily that someone played", () => {
    const ids = countedDailyIds([daily("played", "2026-10-15")], new Set(["played"]), options);
    expect(ids).toEqual(["played"]);
  });

  it("does not count a past daily nobody played", () => {
    const ids = countedDailyIds([daily("unplayed", "2026-10-15")], new Set(), options);
    expect(ids).toEqual([]);
  });

  it("counts today's and upcoming dailies before anyone can have played them", () => {
    const ids = countedDailyIds(
      [daily("today", "2026-10-20"), daily("next", "2026-10-21")],
      new Set(),
      options,
    );
    expect(ids).toEqual(["today", "next"]);
  });

  it("counts dailies from before plays were recorded, since nobody can know", () => {
    const ids = countedDailyIds([daily("old", "2026-10-07")], new Set(), options);
    expect(ids).toEqual(["old"]);
  });
});
