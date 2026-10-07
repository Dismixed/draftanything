import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  buildChains,
  loadActivePhrases,
  saveDraftChains,
  type CandidateChain,
  type PhraseNode,
} from "./generator";

const phrase = (
  word_a: string,
  word_b: string,
  commonness_score = 9,
  category: string | null = null,
): PhraseNode => ({ word_a, word_b, phrase: `${word_a} ${word_b}`, commonness_score, category });

/** A single unbranching path: sun > light > house > boat > yard. */
const PATH = [phrase("sun", "light"), phrase("light", "house"), phrase("house", "boat"), phrase("boat", "yard")];

const chainWords = (chains: CandidateChain[]) => chains.map((c) => c.words.join(" "));

describe("buildChains", () => {
  it("walks the phrase graph into a chain of the requested length", () => {
    const chains = buildChains(PATH, { length: 5, count: 10 });
    expect(chainWords(chains)).toEqual(["sun light house boat yard"]);
    expect(chains[0].phrases).toEqual(["sun light", "light house", "house boat", "boat yard"]);
  });

  it("never routes through an ambiguous link", () => {
    // "house boat" and "house boot" look identical to the player: h _ _ _.
    const chains = buildChains([...PATH, phrase("house", "boot")], { length: 5, count: 10 });
    expect(chains).toEqual([]);
  });

  it("takes an unambiguous detour around an ambiguous link", () => {
    const phrases = [
      ...PATH,
      phrase("house", "boot"),
      phrase("house", "plant"),
      phrase("plant", "food"),
    ];
    const chains = buildChains(phrases, { length: 5, count: 10 });
    expect(chainWords(chains)).toEqual(["sun light house plant food"]);
  });

  it("uses at most one particle word per chain", () => {
    const phrases = [phrase("bang", "on"), phrase("on", "off"), phrase("off", "side"), phrase("side", "bar")];
    expect(buildChains(phrases, { length: 5, count: 10 })).toEqual([]);
  });

  it("skips links used in a recent daily", () => {
    const chains = buildChains(PATH, { length: 5, count: 10, excludeLinks: new Set(["house boat"]) });
    expect(chains).toEqual([]);
  });

  it("skips chains that already exist as puzzles", () => {
    const chains = buildChains(PATH, {
      length: 5,
      count: 10,
      excludeChains: new Set(["sun|light|house|boat|yard"]),
    });
    expect(chains).toEqual([]);
  });

  it("skips links below the minimum link score", () => {
    const phrases = [PATH[0], PATH[1], phrase("house", "boat", 4), PATH[3]];
    expect(buildChains(phrases, { length: 5, count: 10, minLinkScore: 5 })).toEqual([]);
    expect(buildChains(phrases, { length: 5, count: 10 })).toHaveLength(1);
  });

  it("labels difficulty from the weakest link", () => {
    const medium = [PATH[0], PATH[1], phrase("house", "boat", 6), PATH[3]];
    const hard = [PATH[0], PATH[1], phrase("house", "boat", 3), PATH[3]];
    expect(buildChains(PATH, { length: 5, count: 1 })[0].difficulty).toBe("easy");
    expect(buildChains(medium, { length: 5, count: 1 })[0].difficulty).toBe("medium");
    expect(buildChains(hard, { length: 5, count: 1 })[0].difficulty).toBe("hard");
  });

  it("returns only chains of the requested difficulty", () => {
    const phrases = [
      ...PATH,
      // A second route from "house" whose weakest link is medium.
      phrase("house", "plant", 6),
      phrase("plant", "food"),
    ];
    expect(chainWords(buildChains(phrases, { length: 5, count: 10, difficulty: "easy" }))).toEqual([
      "sun light house boat yard",
    ]);
    expect(chainWords(buildChains(phrases, { length: 5, count: 10, difficulty: "medium" }))).toEqual([
      "sun light house plant food",
    ]);
    expect(buildChains(phrases, { length: 5, count: 10, difficulty: "hard" })).toEqual([]);
  });

  it("judges ambiguity against every phrase even when filtering by category", () => {
    const phrases = [
      phrase("sun", "light", 9, "nature"),
      phrase("light", "house", 9, "nature"),
      phrase("house", "boat", 9, "nature"),
      phrase("boat", "yard", 9, "nature"),
      phrase("house", "boot", 9, "fashion"),
    ];
    expect(buildChains(phrases, { length: 5, count: 10, category: "nature" })).toEqual([]);
  });

  it("stops at the requested count", () => {
    const phrases = [...PATH, phrase("boat", "house"), phrase("yard", "sale"), phrase("sale", "price")];
    expect(buildChains(phrases, { length: 5, count: 1 })).toHaveLength(1);
  });
});

describe("loadActivePhrases", () => {
  it("pages past the 1000-row response limit", async () => {
    const rows = Array.from({ length: 2300 }, (_, i) => phrase(`a${i}`, `b${i}`));
    const range = vi.fn(async (from: number, to: number) => ({
      data: rows.slice(from, to + 1),
      error: null,
    }));
    const db = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ range }) }),
        }),
      }),
    } as unknown as SupabaseClient<Database>;

    const loaded = await loadActivePhrases(db);

    expect(loaded).toHaveLength(2300);
    expect(range).toHaveBeenCalledTimes(3);
  });
});

describe("saveDraftChains", () => {
  it("inserts words and phrases as jsonb arrays, not stringified JSON", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const db = {
      from: vi.fn().mockReturnValue({ insert }),
    } as unknown as SupabaseClient<Database>;

    const chains: CandidateChain[] = [
      {
        words: ["ice", "cream", "cheese"],
        phrases: ["ice cream", "cream cheese"],
        difficulty: "easy",
        theme: "food",
        score: 16,
      },
    ];

    await saveDraftChains(db, chains, "test@example.com");

    expect(insert).toHaveBeenCalledTimes(1);
    const records = insert.mock.calls[0][0] as Array<{
      words: unknown;
      phrases: unknown;
    }>;

    expect(Array.isArray(records[0].words)).toBe(true);
    expect(Array.isArray(records[0].phrases)).toBe(true);
    expect(records[0].words).toEqual(["ice", "cream", "cheese"]);
    expect(records[0].phrases).toEqual(["ice cream", "cream cheese"]);
  });
});
