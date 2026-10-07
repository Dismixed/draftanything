import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  countUnusedApproved,
  pickNextApprovedPuzzleId,
  scheduleDailyPuzzle,
} from "@/lib/getting-warmer/schedule-service";

type Row = { puzzle_id: string; publish_date: string };

/**
 * Stand-in for the puzzle and schedule tables. `approved` is in creation
 * order; archived puzzles are simply not in it, as the query filters them.
 */
function fakeDb(approved: string[], schedule: Row[], options: { insertError?: { code: string; message: string }; winner?: Row } = {}) {
  const rows = [...schedule].sort((a, b) => a.publish_date.localeCompare(b.publish_date));
  const inserts: Row[] = [];
  const ranges: [number, number][] = [];
  const db = {
    from: (table: string) => {
      if (table === "getting_warmer_puzzles") {
        return { select: () => ({ eq: () => ({ order: async () => ({ data: approved.map((id) => ({ id })), error: null }) }) }) };
      }
      return {
        select: () => ({
          order: () => ({
            range: async (from: number, to: number) => {
              ranges.push([from, to]);
              return { data: rows.slice(from, to + 1), error: null };
            },
          }),
          eq: (_column: string, date: string) => ({
            maybeSingle: async () => ({ data: rows.find((r) => r.publish_date === date) ?? null, error: null }),
          }),
        }),
        insert: async (row: Row) => {
          inserts.push(row);
          if (options.insertError) {
            if (options.winner) rows.push(options.winner);
            return { error: options.insertError };
          }
          rows.push(row);
          return { error: null };
        },
      };
    },
  } as unknown as SupabaseClient<Database>;
  return { db, inserts, ranges };
}

const ran = (puzzle_id: string, publish_date: string): Row => ({ puzzle_id, publish_date });

describe("pickNextApprovedPuzzleId", () => {
  it("takes never-used puzzles first, in creation order", async () => {
    const { db } = fakeDb(["a", "b", "c"], [ran("a", "2026-07-10")]);
    expect(await pickNextApprovedPuzzleId(db, "2026-10-08")).toBe("b");
  });

  it("recycles the puzzle used longest ago once all have been used", async () => {
    const { db } = fakeDb(["a", "b", "c"], [ran("a", "2026-07-10"), ran("b", "2026-07-11"), ran("c", "2026-07-12"), ran("a", "2026-07-13")]);
    expect(await pickNextApprovedPuzzleId(db, "2026-10-08")).toBe("b");
  });

  it("breaks a tie on last-used date by creation order", async () => {
    const { db } = fakeDb(["a", "b"], []);
    expect(await pickNextApprovedPuzzleId(db, "2026-10-08")).toBe("a");
  });

  it("does not count a future assignment as use for an earlier date", async () => {
    const { db } = fakeDb(["a", "b"], [ran("a", "2026-07-10"), ran("b", "2026-10-20")]);
    expect(await pickNextApprovedPuzzleId(db, "2026-10-08")).toBe("b");
  });

  it("returns nothing only when there are no approved puzzles", async () => {
    const { db } = fakeDb([], [ran("archived", "2026-07-10")]);
    expect(await pickNextApprovedPuzzleId(db, "2026-10-08")).toBeNull();
  });

  it("reads schedule history past the first page", async () => {
    // "old" ran once, long ago; "busy" has filled every day since, across more than one page.
    const history = [ran("old", "2020-01-01")];
    for (let i = 0; i < 1500; i++) {
      const date = new Date(Date.UTC(2020, 0, 2 + i)).toISOString().slice(0, 10);
      history.push(ran("busy", date));
    }
    const { db, ranges } = fakeDb(["busy", "old"], history);

    expect(await pickNextApprovedPuzzleId(db, "2026-10-08")).toBe("old");
    expect(ranges.length).toBeGreaterThan(1);
  });
});

describe("countUnusedApproved", () => {
  it("counts approved puzzles with no assignment on or before the date", async () => {
    const schedule = [ran("used", "2026-07-10"), ran("future", "2026-10-20"), ran("archived", "2026-07-11")];
    const { db } = fakeDb(["used", "future", "never"], schedule);
    expect(await countUnusedApproved(db, "2026-10-08")).toBe(2);
    expect(await countUnusedApproved(db, "2026-10-20")).toBe(1);
  });
});

describe("scheduleDailyPuzzle", () => {
  it("leaves an existing assignment unchanged", async () => {
    const { db, inserts } = fakeDb(["a", "b"], [ran("a", "2026-10-08")]);
    expect(await scheduleDailyPuzzle(db, "2026-10-08")).toEqual({ puzzleId: "a", date: "2026-10-08", alreadyScheduled: true });
    expect(inserts).toEqual([]);
  });

  it("schedules an unused puzzle before recycling", async () => {
    const { db, inserts } = fakeDb(["a", "b"], [ran("a", "2026-07-10")]);
    expect(await scheduleDailyPuzzle(db, "2026-10-08")).toEqual({ puzzleId: "b", date: "2026-10-08", alreadyScheduled: false });
    expect(inserts).toEqual([ran("b", "2026-10-08")]);
  });

  it("recycles the oldest-used puzzle when none is unused", async () => {
    const { db } = fakeDb(["a", "b"], [ran("a", "2026-07-10"), ran("b", "2026-07-11")]);
    expect((await scheduleDailyPuzzle(db, "2026-10-08"))?.puzzleId).toBe("a");
  });

  it("advances the rotation when today and tomorrow are scheduled in turn", async () => {
    const { db } = fakeDb(["a", "b"], [ran("a", "2026-07-10"), ran("b", "2026-07-11")]);
    await scheduleDailyPuzzle(db, "2026-10-08");
    expect((await scheduleDailyPuzzle(db, "2026-10-09"))?.puzzleId).toBe("b");
  });

  it("returns nothing when there are no approved puzzles", async () => {
    const { db, inserts } = fakeDb([], []);
    expect(await scheduleDailyPuzzle(db, "2026-10-08")).toBeNull();
    expect(inserts).toEqual([]);
  });

  it("returns the assignment that won when another request claimed the date first", async () => {
    const { db } = fakeDb(["a", "b"], [], {
      insertError: { code: "23505", message: "duplicate" },
      winner: ran("b", "2026-10-08"),
    });
    expect(await scheduleDailyPuzzle(db, "2026-10-08")).toEqual({ puzzleId: "b", date: "2026-10-08", alreadyScheduled: true });
  });
});
