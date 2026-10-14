import { describe, expect, it } from "vitest";
import { INTRO_COUNT_FLOOR, introCount } from "@/lib/daily-intro/count-service";

/** A Supabase stand-in that records the query and answers every count with `count`. */
function fakeDb(count: number | null, error: { message: string } | null = null) {
  const calls: { table: string; filters: [string, string, unknown][] } = { table: "", filters: [] };
  const builder = {
    select: () => builder,
    eq: (col: string, val: unknown) => (calls.filters.push(["eq", col, val]), builder),
    gte: (col: string, val: unknown) => (calls.filters.push(["gte", col, val]), builder),
    lt: (col: string, val: unknown) => (calls.filters.push(["lt", col, val]), builder),
    then: (resolve: (v: unknown) => void) => resolve({ count, error }),
  };
  const db = { from: (table: string) => ((calls.table = table), builder) };
  return { db: db as never, calls };
}

describe("introCount", () => {
  it("counts today's finishes for a game that records them", async () => {
    const { db, calls } = fakeDb(140);

    expect(await introCount(db, "freezeframes", "2026-10-14")).toBe(140);
    expect(calls.table).toBe("daily_finishes");
    expect(calls.filters).toEqual([
      ["eq", "game", "freezeframes"],
      ["eq", "play_date", "2026-10-14"],
    ]);
  });

  it("counts Chain Link's daily attempts made during the UTC day", async () => {
    const { db, calls } = fakeDb(300);

    expect(await introCount(db, "chainlink", "2026-10-14")).toBe(300);
    expect(calls.table).toBe("chain_puzzle_attempts");
    expect(calls.filters).toEqual([
      ["eq", "mode", "daily"],
      ["gte", "created_at", "2026-10-14T00:00:00Z"],
      ["lt", "created_at", "2026-10-15T00:00:00.000Z"],
    ]);
  });

  it("hides a count below the floor", async () => {
    expect(await introCount(fakeDb(INTRO_COUNT_FLOOR - 1).db, "anyguessr", "2026-10-14")).toBeNull();
    expect(await introCount(fakeDb(INTRO_COUNT_FLOOR).db, "anyguessr", "2026-10-14")).toBe(INTRO_COUNT_FLOOR);
  });

  it("has nothing for Hot Takes, which records no plays", async () => {
    const { db, calls } = fakeDb(999);

    expect(await introCount(db, "hot-takes", "2026-10-14")).toBeNull();
    expect(calls.table).toBe("");
  });

  it("throws when the query fails", async () => {
    await expect(introCount(fakeDb(null, { message: "boom" }).db, "brain-dead", "2026-10-14")).rejects.toThrow("boom");
  });
});
