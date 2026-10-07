import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TransformedQuestion } from "./trivia-api";

vi.mock("./trivia-api", () => ({ fetchQuestionsByDifficulty: vi.fn() }));

import { buildDailySet, getDailyQuestions, maxDailyScore } from "./daily-service";
import { fetchQuestionsByDifficulty } from "./trivia-api";

const mockFetchTier = fetchQuestionsByDifficulty as unknown as ReturnType<typeof vi.fn>;

const DIFFICULTY = { easy: 1, medium: 2, hard: 3 } as const;
type Tier = keyof typeof DIFFICULTY;

const question = (id: string, tier: Tier): TransformedQuestion => ({
  id,
  q: `Question ${id}?`,
  a: ["a", "b", "c", "d"],
  c: 0,
  d: DIFFICULTY[tier],
  cat: "General Knowledge",
});

/** `count` questions of one tier with ids like "easy-0". */
const tier = (name: Tier, count: number, offset = 0) =>
  Array.from({ length: count }, (_, i) => question(`${name}-${i + offset}`, name));

describe("buildDailySet", () => {
  it("returns five easy, five medium and five hard questions, easiest first", async () => {
    const set = await buildDailySet(async (name) => tier(name, 20), new Set());
    expect(set.map((q) => q.d)).toEqual([1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3]);
  });

  it("leaves out questions used in a recent daily", async () => {
    const recent = new Set(["easy-0", "easy-1", "hard-3"]);
    const set = await buildDailySet(async (name) => tier(name, 20), recent);
    expect(set.some((q) => recent.has(q.id))).toBe(false);
    expect(set).toHaveLength(15);
  });

  it("fetches a tier again when the first batch comes up short", async () => {
    let easyCalls = 0;
    const set = await buildDailySet(async (name) => {
      if (name !== "easy") return tier(name, 20);
      return tier("easy", 3, easyCalls++ * 3);
    }, new Set());
    expect(set.filter((q) => q.d === 1)).toHaveLength(5);
    expect(easyCalls).toBe(2);
  });

  it("never uses the same question twice", async () => {
    const set = await buildDailySet(async (name) => [...tier(name, 3), ...tier(name, 6)], new Set());
    expect(new Set(set.map((q) => q.id)).size).toBe(15);
  });

  it("fails when a tier cannot be filled", async () => {
    await expect(
      buildDailySet(async (name) => (name === "hard" ? tier("hard", 2) : tier(name, 20)), new Set()),
    ).rejects.toThrow(/hard/);
  });
});

describe("maxDailyScore", () => {
  it("is the best possible score for the set", () => {
    // 150 per easy, 300 per medium, 450 per hard.
    expect(maxDailyScore([...tier("easy", 5), ...tier("medium", 5), ...tier("hard", 5)])).toBe(4500);
    expect(maxDailyScore(tier("hard", 15))).toBe(6750);
  });
});

/** `brain_dead_daily` stand-in holding rows by date. */
function dailyDb(rows: Record<string, TransformedQuestion[]>, insertError?: { code: string; message: string }) {
  const inserts: { play_date: string; questions: TransformedQuestion[] }[] = [];
  const db = {
    from: () => ({
      select: () => ({
        eq: (_column: string, date: string) => ({
          maybeSingle: async () => ({ data: rows[date] ? { questions: rows[date] } : null, error: null }),
        }),
        gte: () => ({
          lt: async () => ({ data: Object.values(rows).map((questions) => ({ questions })), error: null }),
        }),
      }),
      insert: async (row: { play_date: string; questions: TransformedQuestion[] }) => {
        inserts.push(row);
        return { error: insertError ?? null };
      },
    }),
  } as unknown as SupabaseClient<Database>;
  return { db, inserts };
}

describe("getDailyQuestions", () => {
  beforeEach(() => {
    mockFetchTier.mockReset().mockImplementation(async (name: Tier) => tier(name, 20));
  });

  it("returns the stored set without fetching", async () => {
    const stored = tier("easy", 15);
    const { db, inserts } = dailyDb({ "2026-10-08": stored });

    expect(await getDailyQuestions(db, "2026-10-08")).toEqual(stored);
    expect(mockFetchTier).not.toHaveBeenCalled();
    expect(inserts).toEqual([]);
  });

  it("builds and stores a set for a date that has none", async () => {
    const { db, inserts } = dailyDb({});

    const questions = await getDailyQuestions(db, "2026-10-08");

    expect(questions).toHaveLength(15);
    expect(inserts).toEqual([{ play_date: "2026-10-08", questions }]);
  });

  it("avoids questions from other recent dailies", async () => {
    const { db } = dailyDb({ "2026-10-07": tier("easy", 5) });

    const questions = await getDailyQuestions(db, "2026-10-08");

    expect(questions.filter((q) => q.d === 1).map((q) => q.id)).toEqual(
      expect.not.arrayContaining(["easy-0", "easy-1", "easy-2", "easy-3", "easy-4"]),
    );
  });

  it("serves the stored set when another request saved the date first", async () => {
    const winner = tier("medium", 15);
    const rows: Record<string, TransformedQuestion[]> = {};
    const { db } = dailyDb(rows, { code: "23505", message: "duplicate" });
    mockFetchTier.mockImplementation(async (name: Tier) => {
      rows["2026-10-08"] = winner; // the other request lands while we fetch
      return tier(name, 20);
    });

    expect(await getDailyQuestions(db, "2026-10-08")).toEqual(winner);
  });
});
