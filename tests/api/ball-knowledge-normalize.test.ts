import { describe, expect, it } from "vitest";
import { getCategoryForDayIndex } from "@/lib/ball-knowledge/categories";
import { findMatch, levenshtein, normKey, normalize } from "@/lib/ball-knowledge/normalize";

describe("ball-knowledge normalize", () => {
  it("normalizes punctuation and case", () => {
    expect(normalize("Los Angeles Lakers!")).toBe("los angeles lakers");
    expect(normKey("The Lakers")).toBe("lakers");
  });

  it("computes levenshtein distance", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("abc", "abc")).toBe(0);
  });
});

describe("ball-knowledge findMatch", () => {
  it("matches canonical NBA team names and aliases", () => {
    const match = findMatch("NBA Teams", "Lakers");
    expect(match?.canonical).toBe("Los Angeles Lakers");
  });

  it("matches with minor typo via fuzzy match", () => {
    const match = findMatch("NBA Teams", "Laker");
    expect(match?.canonical).toBe("Los Angeles Lakers");
  });

  it("returns null for unknown answers", () => {
    expect(findMatch("NBA Teams", "xyznotateam")).toBeNull();
  });

  it("rotates categories by day index", () => {
    expect(getCategoryForDayIndex(0)).toBe("NBA Teams");
    expect(getCategoryForDayIndex(1)).toBe("Pizza Toppings");
  });
});
