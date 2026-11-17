import { describe, expect, it } from "vitest";
import { formatFull, formatShort, inWords, parseGuess, roundNice } from "./numbers";

describe("parseGuess", () => {
  it("reads plain numbers, commas, decimals and currency", () => {
    expect(parseGuess("88")).toBe(88);
    expect(parseGuess("1,250,000")).toBe(1_250_000);
    expect(parseGuess("4.24")).toBe(4.24);
    expect(parseGuess("$450,300,000")).toBe(450_300_000);
    expect(parseGuess(" 12 000 ")).toBe(12_000);
  });

  it("reads shorthand and words", () => {
    expect(parseGuess("4m")).toBe(4_000_000);
    expect(parseGuess("2.5k")).toBe(2500);
    expect(parseGuess("1.2b")).toBe(1_200_000_000);
    expect(parseGuess("3 million")).toBe(3_000_000);
    expect(parseGuess("2bn")).toBe(2_000_000_000);
    expect(parseGuess("1e6")).toBe(1_000_000);
  });

  it("rejects blanks, words alone, zero and negatives", () => {
    expect(parseGuess("")).toBeNull();
    expect(parseGuess("   ")).toBeNull();
    expect(parseGuess("lots")).toBeNull();
    expect(parseGuess("0")).toBeNull();
    expect(parseGuess("-5")).toBeNull();
    expect(parseGuess("m")).toBeNull();
  });
});

describe("formatting", () => {
  it("writes full numbers with commas and keeps small decimals", () => {
    expect(formatFull(384400)).toBe("384,400");
    expect(formatFull(4.24)).toBe("4.24");
    expect(formatFull(6.175)).toBe("6.175");
  });

  it("shortens big numbers", () => {
    expect(formatShort(63_000_000)).toBe("63M");
    expect(formatShort(2500)).toBe("2.5k");
    expect(formatShort(450_300_000)).toBe("450M");
    expect(formatShort(88)).toBe("88");
    expect(formatShort(1.3)).toBe("1.3");
  });

  it("says numbers in words", () => {
    expect(inWords(88)).toBe("eighty-eight");
    expect(inWords(206)).toBe("two hundred six");
    expect(inWords(42_195)).toBe("forty-two thousand one hundred ninety-five");
    expect(inWords(4_000_000)).toBe("four million");
    expect(inWords(4_250_000)).toBe("4.25 million");
  });

  it("rounds to two significant figures", () => {
    expect(roundNice(62_817_334)).toBe(63_000_000);
    expect(roundNice(0.0347)).toBe(0.035);
    expect(roundNice(9.96)).toBe(10);
  });
});
