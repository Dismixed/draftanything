import { describe, expect, it } from "vitest";
import { scoreLinks } from "./score";

const link = (familiarity: number, count: number) => ({ familiarity, count });

describe("scoreLinks", () => {
  it("scores universally known phrases 8 to 10, by corpus count", () => {
    expect(scoreLinks([link(5, 300), link(5, 10), link(5, 40)])).toEqual([10, 8, 9]);
  });

  it("scores widely known phrases 5 to 7 and hesitant ones 2 to 4", () => {
    expect(scoreLinks([link(4, 1), link(4, 2), link(4, 3)])).toEqual([5, 6, 7]);
    expect(scoreLinks([link(3, 1), link(3, 2), link(3, 3)])).toEqual([2, 3, 4]);
  });

  it("ranks a rare but universally known phrase above a frequent, less familiar one", () => {
    const [chickenSoup, chipSet] = scoreLinks([link(5, 1), link(4, 1_000_000)]);
    expect(chickenSoup).toBeGreaterThan(chipSet);
  });

  it("ranks each familiarity level against its own phrases only", () => {
    const scores = scoreLinks([link(5, 1), link(5, 2), link(5, 3), link(4, 900), link(4, 800), link(4, 700)]);
    expect(scores).toEqual([8, 9, 10, 7, 6, 5]);
  });

  it("gives equal counts at the same familiarity the same score", () => {
    const scores = scoreLinks([link(5, 7), link(5, 7), link(5, 7), link(5, 900)]);
    expect(new Set(scores.slice(0, 3)).size).toBe(1);
    expect(scores[3]).toBeGreaterThan(scores[0]);
  });

  it("splits a large level into three near-equal bands", () => {
    const scores = scoreLinks(Array.from({ length: 300 }, (_, i) => link(4, i)));
    expect(scores.filter((s) => s === 5)).toHaveLength(100);
    expect(scores.filter((s) => s === 6)).toHaveLength(100);
    expect(scores.filter((s) => s === 7)).toHaveLength(100);
  });

  it("returns an empty list for no input", () => {
    expect(scoreLinks([])).toEqual([]);
  });
});
