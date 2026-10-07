import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  pickNextCandidate,
  scheduleNextApprovedPuzzle,
  type ScheduleCandidate,
} from "./schedule-service";

function candidate(
  id: string,
  startLetter: string,
  difficulty: string,
  score: number,
): ScheduleCandidate {
  return { id, startLetter, difficulty, score };
}

describe("pickNextCandidate", () => {
  it("deprioritizes start letters seen in the recent window", () => {
    const a = candidate("a", "a", "easy", 100);
    const b = candidate("b", "b", "easy", 90);

    // "a" was just scheduled, so "b" wins despite the lower score.
    expect(pickNextCandidate([a, b], ["a"], null).id).toBe("b");
  });

  it("prefers a difficulty that differs from the previous day", () => {
    const easy = candidate("easy", "x", "easy", 100);
    const hard = candidate("hard", "y", "hard", 90);

    // Previous day was "easy", so "hard" balances better.
    expect(pickNextCandidate([easy, hard], [], "easy").id).toBe("hard");
  });

  it("tie-breaks by input order (score desc from the caller)", () => {
    const first = candidate("first", "x", "easy", 100);
    const second = candidate("second", "y", "easy", 90);

    // Equal fit (both novel letters, both novel difficulty) → first wins.
    expect(pickNextCandidate([first, second], [], null).id).toBe("first");
  });
});

/**
 * Supabase stand-in: every builder method chains, and awaiting a query
 * resolves the next queued result for that table.
 */
function fakeDb(queues: Record<string, { data?: unknown; error?: unknown }[]>) {
  const calls: { table: string; method: string; args: unknown[] }[] = [];
  const from = (table: string) => {
    const builder: Record<string, unknown> = {};
    const proxy: unknown = new Proxy(builder, {
      get(_target, method: string) {
        if (method === "then") {
          const result = queues[table]?.shift();
          if (!result) throw new Error(`unexpected query on ${table}`);
          return (resolve: (value: unknown) => void) =>
            resolve({ data: result.data ?? null, error: result.error ?? null });
        }
        return (...args: unknown[]) => {
          calls.push({ table, method, args });
          return proxy;
        };
      },
    });
    return proxy;
  };
  return { db: { from } as unknown as SupabaseClient<Database>, calls };
}

const approved = (id: string, firstWord: string, score: number, difficulty = "medium") => ({
  id,
  words: [firstWord, "b", "c", "d", "e"],
  difficulty,
  score,
});

describe("scheduleNextApprovedPuzzle", () => {
  it("schedules an approved puzzle that is not on the calendar yet", async () => {
    const { db, calls } = fakeDb({
      chain_puzzles: [
        { data: [approved("used", "apple", 30), approved("fresh", "sun", 20)] },
        { data: [{ id: "used", words: ["apple", "b"], difficulty: "hard" }] },
        { data: null },
      ],
      daily_chain_puzzles: [{ data: [{ puzzle_id: "used", publish_date: "2026-10-01" }] }, { data: null }],
    });

    expect(await scheduleNextApprovedPuzzle(db, "2026-10-08")).toBe(true);

    const insert = calls.find((c) => c.table === "daily_chain_puzzles" && c.method === "insert");
    expect(insert?.args[0]).toEqual({ publish_date: "2026-10-08", puzzle_id: "fresh" });
    const update = calls.find((c) => c.table === "chain_puzzles" && c.method === "update");
    expect(update?.args[0]).toMatchObject({ status: "scheduled" });
  });

  it("avoids a start letter used by the dailies just before it", async () => {
    const { db, calls } = fakeDb({
      chain_puzzles: [
        { data: [approved("book", "book", 30), approved("sun", "sun", 20)] },
        { data: [{ id: "prev", words: ["back", "pack"], difficulty: "easy" }] },
        { data: null },
      ],
      daily_chain_puzzles: [{ data: [{ puzzle_id: "prev", publish_date: "2026-10-07" }] }, { data: null }],
    });

    await scheduleNextApprovedPuzzle(db, "2026-10-08");

    const insert = calls.find((c) => c.table === "daily_chain_puzzles" && c.method === "insert");
    expect(insert?.args[0]).toMatchObject({ puzzle_id: "sun" });
  });

  it("does nothing when every approved puzzle is already scheduled", async () => {
    const { db, calls } = fakeDb({
      chain_puzzles: [{ data: [approved("used", "apple", 30)] }],
      daily_chain_puzzles: [{ data: [{ puzzle_id: "used", publish_date: "2026-10-01" }] }],
    });

    expect(await scheduleNextApprovedPuzzle(db, "2026-10-08")).toBe(false);
    expect(calls.some((c) => c.method === "insert")).toBe(false);
  });

  it("defers to a concurrent request that claimed the date first", async () => {
    const { db, calls } = fakeDb({
      chain_puzzles: [{ data: [approved("fresh", "sun", 20)] }],
      daily_chain_puzzles: [{ data: [] }, { error: { code: "23505", message: "duplicate" } }],
    });

    expect(await scheduleNextApprovedPuzzle(db, "2026-10-08")).toBe(true);
    expect(calls.some((c) => c.method === "update")).toBe(false);
  });
});
