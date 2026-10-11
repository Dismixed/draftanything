import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

vi.mock("@/lib/brain-dead/daily-service", () => ({
  getDailyQuestions: vi.fn(async () => [{ d: 1 }, { d: 2 }]),
  maxDailyScore: vi.fn(() => 2250),
}));

import { getDailyQuestions } from "@/lib/brain-dead/daily-service";
import { dayCounts, findOwnScore, recordFinish, scoreBounds } from "@/lib/games/daily-finish-service";

interface Row {
  id: string;
  game: string;
  play_date: string;
  score: number;
  user_id: string | null;
  guest_id: string | null;
}

/** Just enough of the Supabase query builder for this service: eq/lt/gt filters, counts, one insert. */
function fakeDb(rows: Row[]) {
  const query = (head: boolean) => {
    const filters: ((row: Row) => boolean)[] = [];
    const run = () => rows.filter((row) => filters.every((keep) => keep(row)));
    const q = {
      eq(column: keyof Row, value: unknown) {
        filters.push((row) => row[column] === value);
        return q;
      },
      lt(column: keyof Row, value: number) {
        filters.push((row) => (row[column] as number) < value);
        return q;
      },
      gt(column: keyof Row, value: number) {
        filters.push((row) => (row[column] as number) > value);
        return q;
      },
      async maybeSingle() {
        return { data: run()[0] ?? null, error: null };
      },
      then<T>(resolve: (value: { data: Row[] | null; count: number; error: null }) => T) {
        const found = run();
        return Promise.resolve({ data: head ? null : found, count: found.length, error: null }).then(resolve);
      },
    };
    return q;
  };

  return {
    from: () => ({
      select: (_columns: string, options?: { head?: boolean }) => query(Boolean(options?.head)),
      insert: async (row: Omit<Row, "id">) => {
        rows.push({ id: String(rows.length + 1), ...row });
        return { error: null };
      },
    }),
  } as unknown as SupabaseClient<Database>;
}

const DAY = "2026-10-11";
const guest = (id: string) => ({ userId: null, guestId: id });
const row = (score: number, guestId: string, game = "freezeframes", date = DAY): Row => ({
  id: guestId,
  game,
  play_date: date,
  score,
  user_id: null,
  guest_id: guestId,
});

describe("recordFinish", () => {
  let rows: Row[];
  beforeEach(() => {
    rows = [];
  });

  it("stores the first finish of the day", async () => {
    const stored = await recordFinish(fakeDb(rows), "freezeframes", DAY, 2400, guest("g1"));

    expect(stored).toBe(2400);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ game: "freezeframes", play_date: DAY, score: 2400, guest_id: "g1", user_id: null });
  });

  it("keeps the first score when the same player posts again", async () => {
    const db = fakeDb(rows);
    await recordFinish(db, "freezeframes", DAY, 2400, guest("g1"));
    const stored = await recordFinish(db, "freezeframes", DAY, 4000, guest("g1"));

    expect(stored).toBe(2400);
    expect(rows).toHaveLength(1);
  });

  it("stores a signed-in player under their user id, not a guest id", async () => {
    await recordFinish(fakeDb(rows), "anyguessr", DAY, 500, { userId: "u1", guestId: "g1" });
    expect(rows[0]).toMatchObject({ user_id: "u1", guest_id: null });
  });

  it("keeps games and days apart", async () => {
    const db = fakeDb(rows);
    await recordFinish(db, "freezeframes", DAY, 2400, guest("g1"));
    await recordFinish(db, "anyguessr", DAY, 300, guest("g1"));
    await recordFinish(db, "freezeframes", "2026-10-12", 100, guest("g1"));
    expect(rows).toHaveLength(3);
  });
});

describe("findOwnScore", () => {
  it("returns null for a player with no identity or no finish", async () => {
    const db = fakeDb([row(900, "g1")]);
    expect(await findOwnScore(db, "freezeframes", DAY, { userId: null, guestId: null })).toBeNull();
    expect(await findOwnScore(db, "freezeframes", DAY, guest("g2"))).toBeNull();
    expect(await findOwnScore(db, "freezeframes", DAY, guest("g1"))).toBe(900);
  });
});

describe("dayCounts", () => {
  const rows = [row(100, "a"), row(200, "b"), row(200, "c"), row(300, "d"), row(999, "e", "anyguessr"), row(50, "f", "freezeframes", "2026-10-10")];

  it("counts only strictly lower scores as worse when higher is better", async () => {
    expect(await dayCounts(fakeDb(rows), "freezeframes", DAY, 200, "higher")).toEqual({ total: 4, worse: 1 });
  });

  it("counts only strictly higher scores as worse when lower is better", async () => {
    expect(await dayCounts(fakeDb(rows), "freezeframes", DAY, 200, "lower")).toEqual({ total: 4, worse: 1 });
    expect(await dayCounts(fakeDb(rows), "freezeframes", DAY, 100, "lower")).toEqual({ total: 4, worse: 3 });
  });

  it("is zero on a day nobody has played", async () => {
    expect(await dayCounts(fakeDb([]), "freezeframes", DAY, 200, "higher")).toEqual({ total: 0, worse: 0 });
  });
});

describe("scoreBounds", () => {
  const db = fakeDb([]);

  it("uses each game's own limits", async () => {
    expect(await scoreBounds(db, "anyguessr", DAY)).toEqual({ min: 0, max: 700 });
    expect(await scoreBounds(db, "freezeframes", DAY)).toEqual({ min: 0, max: 4000 });
    expect(await scoreBounds(db, "ball-knowledge", DAY)).toEqual({ min: 0, max: 200 });
    expect(await scoreBounds(db, "getting-warmer", DAY)).toEqual({ min: 1, max: 500 });
  });

  it("limits Brain Dead to a perfect run of that day's questions", async () => {
    expect(await scoreBounds(db, "brain-dead", DAY)).toEqual({ min: 0, max: 2250 });
  });

  it("falls back to the all-days ceiling when the day's questions cannot be loaded", async () => {
    vi.mocked(getDailyQuestions).mockRejectedValueOnce(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await scoreBounds(db, "brain-dead", DAY)).toEqual({ min: 0, max: 6750 });
  });
});
