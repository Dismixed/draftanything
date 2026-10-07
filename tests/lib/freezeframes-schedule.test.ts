import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { countUnscheduledApproved, pickNextPuzzleId } from "@/lib/freezeframes/schedule-service";

/** Approved puzzles in creation order, and the calendar as [puzzle, date] pairs. */
function db(approved: string[], schedule: [string, string][]) {
  return {
    from: (table: string) =>
      table === "freezeframes_puzzles"
        ? {
            select: () => ({
              eq: () => ({ order: async () => ({ data: approved.map((id) => ({ id })), error: null }) }),
            }),
          }
        : {
            select: async () => ({
              data: schedule.map(([puzzle_id, publish_date]) => ({ puzzle_id, publish_date })),
              error: null,
            }),
          },
  } as unknown as SupabaseClient<Database>;
}

describe("pickNextPuzzleId", () => {
  it("takes the oldest approved puzzle that has never run", async () => {
    expect(await pickNextPuzzleId(db(["a", "b", "c"], [["a", "2026-07-09"]]))).toBe("b");
  });

  it("recycles the puzzle that ran longest ago once every puzzle has run", async () => {
    const schedule: [string, string][] = [
      ["a", "2026-07-09"],
      ["b", "2026-07-12"],
      ["c", "2026-07-13"],
      ["a", "2026-07-17"],
    ];
    expect(await pickNextPuzzleId(db(["a", "b", "c"], schedule))).toBe("b");
  });

  it("returns nothing when there are no approved puzzles", async () => {
    expect(await pickNextPuzzleId(db([], []))).toBeNull();
  });
});

describe("countUnscheduledApproved", () => {
  it("counts approved puzzles that have never run", async () => {
    expect(await countUnscheduledApproved(db(["a", "b", "c"], [["a", "2026-07-09"]]))).toBe(2);
    expect(await countUnscheduledApproved(db(["a"], [["a", "2026-07-09"]]))).toBe(0);
  });
});
