import { describe, expect, it } from "vitest";
import {
  INITIAL_CLUES,
  getLetterRevealClue,
  guessesMatch,
  validateClueState,
} from "@/lib/getting-warmer/game-logic";

describe("getting-warmer game logic", () => {
  it("matches guesses ignoring case and punctuation", () => {
    expect(guessesMatch("watermelon", "WATERMELON")).toBe(true);
    expect(guessesMatch("snow globe", "SNOW GLOBE")).toBe(true);
    expect(guessesMatch("apple", "WATERMELON")).toBe(false);
  });

  it("validates clue progression state", () => {
    expect(validateClueState(INITIAL_CLUES, [], 5, [])).toBe(true);
    expect(validateClueState(3, ["APPLE"], 5, [])).toBe(true);
    expect(validateClueState(3, [], 5, [])).toBe(false);
  });

  it("builds letter reveal clues", () => {
    expect(getLetterRevealClue("CAT", 1)).toContain("C");
    expect(getLetterRevealClue("CAT", 1)).toContain("_");
  });
});
