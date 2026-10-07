import { describe, expect, it } from "vitest";
import {
  buildCandidates,
  buildVocabulary,
  dropInflectedDuplicates,
  parseCounts,
  splitCompound,
} from "./candidates";

/** Unigram counts in descending order, as the source file is. */
function unigrams(words: string[]): Map<string, number> {
  return new Map(words.map((word, i) => [word, 1_000_000 - i]));
}

describe("parseCounts", () => {
  it("reads tab-separated term/count lines and skips malformed ones", () => {
    const counts = parseCounts("football\t55972678\napple juice\t196757\n\nbroken line\n");
    expect([...counts]).toEqual([
      ["football", 55972678],
      ["apple juice", 196757],
    ]);
  });
});

describe("buildVocabulary", () => {
  it("keeps ordinary words within the rank limit", () => {
    const vocab = buildVocabulary(unigrams(["foot", "ball", "rare"]), 2);
    expect([...vocab]).toEqual(["foot", "ball"]);
  });

  it("rejects function words, affix fragments, blocked words and non-letters", () => {
    const vocab = buildVocabulary(unigrams(["the", "ing", "non", "porn", "mp3", "book"]), 100);
    expect([...vocab]).toEqual(["book"]);
  });

  it("rejects two-letter words unless they are allow-listed particles", () => {
    const vocab = buildVocabulary(unigrams(["up", "ox", "re", "out"]), 100);
    expect([...vocab]).toEqual(["up", "out"]);
  });

  it("rejects words longer than eight letters", () => {
    const vocab = buildVocabulary(unigrams(["mechanics", "mechanic"]), 100);
    expect([...vocab]).toEqual(["mechanic"]);
  });
});

describe("splitCompound", () => {
  const vocab = new Set(["foot", "ball", "car", "pet", "carp", "up", "set"]);

  it("splits a word into two vocabulary words", () => {
    expect(splitCompound("football", vocab)).toEqual([["foot", "ball"]]);
  });

  it("returns every valid split point", () => {
    expect(splitCompound("carpet", vocab)).toEqual([["car", "pet"]]);
    expect(splitCompound("upset", vocab)).toEqual([["up", "set"]]);
  });

  it("returns nothing when either half is not a vocabulary word", () => {
    expect(splitCompound("footpath", vocab)).toEqual([]);
  });
});

describe("dropInflectedDuplicates", () => {
  it("drops a plural second word when the singular pair exists", () => {
    const kept = dropInflectedDuplicates([
      { word_a: "fire", word_b: "place", count: 10, form: "closed" },
      { word_a: "fire", word_b: "places", count: 5, form: "closed" },
      { word_a: "sun", word_b: "glasses", count: 7, form: "closed" },
      { word_a: "lunch", word_b: "box", count: 4, form: "closed" },
      { word_a: "lunch", word_b: "boxes", count: 2, form: "closed" },
    ]);
    expect(kept.map((c) => `${c.word_a} ${c.word_b}`)).toEqual([
      "fire place",
      "sun glasses",
      "lunch box",
    ]);
  });
});

describe("buildCandidates", () => {
  const uni = new Map<string, number>([
    ["foot", 900],
    ["ball", 800],
    ["book", 700],
    ["store", 600],
    ["hot", 500],
    ["dog", 400],
    ["house", 390],
    ["football", 300],
    ["bookstore", 200],
    ["doghouse", 150],
    ["hothouse", 140],
    ["storehouse", 5],
  ]);
  const bi = new Map<string, number>([
    ["book store", 50],
    ["hot dog", 40],
    ["Hot Dog", 30],
    ["hot the", 20],
    ["foot zebra", 10],
  ]);
  const options = { maxHalfRank: 7, minClosedCount: 100, minVocabUses: 1 };

  it("emits closed compounds at or above the count floor", () => {
    const pairs = buildCandidates(uni, bi, options).map((c) => `${c.word_a} ${c.word_b}`);
    expect(pairs).toContain("foot ball");
    expect(pairs).not.toContain("store house");
  });

  it("sums the counts when a pair is seen both closed and open", () => {
    const store = buildCandidates(uni, bi, options).find((c) => c.word_b === "store");
    expect(store).toEqual({ word_a: "book", word_b: "store", count: 250, form: "both" });
  });

  it("adds open phrases whose words each appear in enough closed compounds", () => {
    const hotDog = buildCandidates(uni, bi, options).find(
      (c) => c.word_a === "hot" && c.word_b === "dog",
    );
    expect(hotDog).toEqual({ word_a: "hot", word_b: "dog", count: 40, form: "open" });
  });

  it("leaves out open phrases whose words appear in too few closed compounds", () => {
    const candidates = buildCandidates(uni, bi, { ...options, minVocabUses: 2 });
    expect(candidates.some((c) => c.word_a === "hot" && c.word_b === "dog")).toBe(false);
  });

  it("ignores capitalised bigrams and bigrams with words outside the vocabulary", () => {
    const candidates = buildCandidates(uni, bi, options);
    expect(candidates.find((c) => c.word_a === "hot" && c.word_b === "dog")?.count).toBe(40);
    expect(candidates.some((c) => c.word_b === "the" || c.word_b === "zebra")).toBe(false);
  });

  it("drops extra pairs that contain a blocked word or are a blocked pair", () => {
    const candidates = buildCandidates(uni, bi, {
      ...options,
      extraPairs: [["foot", "fetish"], ["strip", "club"], ["city", "centre"]],
    });
    expect(candidates.some((c) => ["fetish", "club", "centre"].includes(c.word_b))).toBe(false);
  });

  it("scores extra pairs from their corpus counts even below the usual floors", () => {
    const candidates = buildCandidates(uni, bi, { ...options, extraPairs: [["store", "house"], ["zebra", "crossing"]] });
    expect(candidates.find((c) => c.word_a === "store")).toEqual({
      word_a: "store",
      word_b: "house",
      count: 5,
      form: "closed",
    });
    expect(candidates.find((c) => c.word_a === "zebra")).toEqual({
      word_a: "zebra",
      word_b: "crossing",
      count: 0,
      form: "open",
    });
  });
});
