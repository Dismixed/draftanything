import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { LINEUP_ROUNDS } from "@/lib/anyguessr/lineup";

const CLUE_TYPES = ["flag", "landmark", "environment", "food", "person", "brand", "wildlife"];
import { getDailyPuzzle } from "@/lib/anyguessr/puzzle-service";

const puzzle = (n: number) => ({
  id: `p${n}`,
  answer: `Country ${n}`,
  answer_id: `C${String(n).padStart(2, "0")}`,
  status: "approved",
  clues: CLUE_TYPES.map((type) => ({
    type,
    content: `${type} of country ${n}`,
    difficulty_rank: 1,
    metadata: { image_url: `https://img/${type}-${n}.jpg` },
  })),
});

/** Stand-in for the lineup and puzzle tables; `pool` can be changed between calls. */
function lineupDb(state: { pool: ReturnType<typeof puzzle>[]; stored: Record<string, unknown>; insertError?: { code: string } }) {
  const inserts: { play_date: string }[] = [];
  const db = {
    from: (table: string) =>
      table === "ag_daily_lineups"
        ? {
            select: () => ({
              eq: (_c: string, date: string) => ({
                maybeSingle: async () => ({
                  data: state.stored[date] ? { puzzle: state.stored[date] } : null,
                  error: null,
                }),
              }),
              gte: () => ({
                lt: async () => ({
                  data: Object.entries(state.stored).map(([play_date, puzzle]) => ({ play_date, puzzle })),
                  error: null,
                }),
              }),
            }),
            insert: async (row: { play_date: string; puzzle: unknown }) => {
              inserts.push(row);
              if (state.insertError) return { error: state.insertError };
              state.stored[row.play_date] = row.puzzle;
              return { error: null };
            },
          }
        : {
            select: () => ({
              in: () => ({ order: () => ({ limit: async () => ({ data: state.pool, error: null }) }) }),
            }),
          },
  } as unknown as SupabaseClient<Database>;
  return { db, inserts };
}

const pool = () => Array.from({ length: 14 }, (_, i) => puzzle(i + 1));

describe("getDailyPuzzle", () => {
  it("stores the lineup the first time a date is asked for", async () => {
    const state = { pool: pool(), stored: {} as Record<string, unknown> };
    const { db, inserts } = lineupDb(state);

    const daily = await getDailyPuzzle(db, "2026-10-20");

    expect(daily!.rounds).toHaveLength(LINEUP_ROUNDS);
    expect(daily!.totalRounds).toBe(LINEUP_ROUNDS);
    expect(daily!.rounds[0].clueType).toBe("flag");
    expect(inserts).toHaveLength(1);
    expect(inserts[0].play_date).toBe("2026-10-20");
  });

  it("keeps serving the stored lineup after the pool changes", async () => {
    const state = { pool: pool(), stored: {} as Record<string, unknown> };
    const { db } = lineupDb(state);
    const first = await getDailyPuzzle(db, "2026-10-20");

    // A newly approved country reshuffles a lineup computed from scratch.
    state.pool = [...state.pool.slice(3), puzzle(99), puzzle(98)];
    const second = await getDailyPuzzle(db, "2026-10-20");

    expect(second).toEqual(first);
  });

  it("serves the lineup another request stored first", async () => {
    const winner = { id: "daily-2026-10-20", date: "2026-10-20", rounds: [], totalRounds: 0 };
    const state = { pool: pool(), stored: {} as Record<string, unknown>, insertError: { code: "23505" } };
    const { db } = lineupDb(state);

    const promise = getDailyPuzzle(db, "2026-10-20");
    state.stored["2026-10-20"] = winner;

    expect(await promise).toEqual(winner);
  });

  it("returns nothing, and stores nothing, when the pool cannot fill a game", async () => {
    const state = { pool: pool().slice(0, 3), stored: {} as Record<string, unknown> };
    const { db, inserts } = lineupDb(state);

    expect(await getDailyPuzzle(db, "2026-10-20")).toBeNull();
    expect(inserts).toEqual([]);
  });
});

describe("getDailyPuzzle repeat avoidance", () => {
  it("does not repeat yesterday's countries when the pool allows", async () => {
    const state = { pool: Array.from({ length: 30 }, (_, i) => puzzle(i + 1)), stored: {} as Record<string, unknown> };
    const { db } = lineupDb(state);

    const first = await getDailyPuzzle(db, "2026-10-20");
    const second = await getDailyPuzzle(db, "2026-10-21");

    const yesterday = new Set(first!.rounds.map((r) => r.puzzleId));
    expect(second!.rounds.filter((r) => yesterday.has(r.puzzleId))).toEqual([]);
  });
});
