import { describe, expect, it } from "vitest";
import {
  chainProblems,
  classifyDifficulty,
  countParticles,
  findAmbiguousLinks,
} from "./chain-rules";

const link = (word_a: string, word_b: string) => ({ word_a, word_b });

describe("findAmbiguousLinks", () => {
  it("flags links whose second words share a first letter and length", () => {
    const ambiguous = findAmbiguousLinks([link("river", "boat"), link("river", "bank"), link("river", "bed")]);
    expect([...ambiguous].sort()).toEqual(["river bank", "river boat"]);
  });

  it("does not flag second words that differ in length or first letter", () => {
    const ambiguous = findAmbiguousLinks([link("fire", "place"), link("fire", "plug"), link("fire", "wall")]);
    expect(ambiguous.size).toBe(0);
  });

  it("only compares links that share a first word", () => {
    const ambiguous = findAmbiguousLinks([link("river", "boat"), link("piggy", "bank")]);
    expect(ambiguous.size).toBe(0);
  });

  it("ignores case", () => {
    const ambiguous = findAmbiguousLinks([link("River", "Boat"), link("river", "bank")]);
    expect(ambiguous.has("river boat")).toBe(true);
  });
});

describe("countParticles", () => {
  it("counts particle words anywhere in the chain", () => {
    expect(countParticles(["bang", "on", "off", "side", "bar"])).toBe(2);
    expect(countParticles(["apple", "juice", "box", "spring", "break"])).toBe(0);
  });
});

describe("classifyDifficulty", () => {
  it("is easy when every link scores 8 or more", () => {
    expect(classifyDifficulty([8, 10, 9, 8])).toBe("easy");
  });

  it("is medium when every link scores 5 or more but not all reach 8", () => {
    expect(classifyDifficulty([10, 10, 5, 9])).toBe("medium");
  });

  it("is hard when any link scores below 5", () => {
    expect(classifyDifficulty([10, 10, 4, 10])).toBe("hard");
  });
});

describe("chainProblems", () => {
  const rules = {
    ambiguous: new Set(["river bank"]),
    recentLinks: new Set(["hot dog"]),
  };

  it("passes a chain that breaks no rule", () => {
    expect(chainProblems(["apple", "juice", "box", "spring", "break"], rules)).toEqual([]);
  });

  it("reports an ambiguous link", () => {
    const problems = chainProblems(["river", "bank", "note", "book", "worm"], rules);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("river bank");
  });

  it("reports a link used in a recent daily", () => {
    const problems = chainProblems(["hot", "dog", "house", "boat", "yard"], rules);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("hot dog");
  });

  it("reports more than one particle word", () => {
    const problems = chainProblems(["bang", "on", "off", "side", "bar"], rules);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("on, off");
  });

  it("reports a repeated word", () => {
    const problems = chainProblems(["book", "mark", "down", "town", "book"], rules);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("book");
  });
});
