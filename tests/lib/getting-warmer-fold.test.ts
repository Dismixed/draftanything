import { describe, expect, it } from "vitest";
import { foldClues, hiddenMisses } from "@/lib/getting-warmer/fold";

describe("Getting Warmer clue folding", () => {
  it("keeps every clue as a row while there are few", () => {
    expect(foldClues(2)).toEqual({ folded: false, hiddenWide: 0, hiddenNarrow: 0 });
    expect(foldClues(6)).toEqual({ folded: false, hiddenWide: 0, hiddenNarrow: 0 });
  });

  it("folds earlier clues into tags after six, without hiding any yet on a wide screen", () => {
    expect(foldClues(7)).toEqual({ folded: true, hiddenWide: 0, hiddenNarrow: 0 });
    expect(foldClues(10)).toEqual({ folded: true, hiddenWide: 0, hiddenNarrow: 3 });
  });

  it("tucks the oldest away however long the round runs", () => {
    expect(foldClues(11)).toEqual({ folded: true, hiddenWide: 1, hiddenNarrow: 4 });
    expect(foldClues(40)).toEqual({ folded: true, hiddenWide: 30, hiddenNarrow: 33 });
  });

  it("copes with no clues", () => {
    expect(foldClues(0)).toEqual({ folded: false, hiddenWide: 0, hiddenNarrow: 0 });
  });

  it("keeps the last four wrong guesses in view", () => {
    expect(hiddenMisses(0)).toBe(0);
    expect(hiddenMisses(4)).toBe(0);
    expect(hiddenMisses(5)).toBe(1);
    expect(hiddenMisses(12)).toBe(8);
  });
});
