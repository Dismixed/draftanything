import { describe, expect, it } from "vitest";
import { normalizeForMatch, quoteInArticle, shapeIssue, timeRelativeWords, unsupportedNumbers } from "@/lib/anyguessr/fun-fact-checks";

const article = "Feijoada is a stew of beans with beef and pork.\nThe dish is usually served with rice, collard greens and orange slices – a classic pairing.";

describe("quoteInArticle", () => {
  it("accepts a sentence copied from the article", () => {
    expect(quoteInArticle("The dish is usually served with rice, collard greens and orange slices", article)).toBe(true);
  });

  it("ignores case, spacing, citation marks and typographic dashes", () => {
    expect(quoteInArticle("the dish is   usually served with rice, collard greens and orange slices - a classic pairing.", article)).toBe(true);
    expect(normalizeForMatch("It’s “good”[1]")).toBe("it's \"good\"");
  });

  it("rejects a sentence the article does not contain", () => {
    expect(quoteInArticle("Feijoada was invented by enslaved people on sugar plantations", article)).toBe(false);
  });

  it("rejects a quote too short to prove anything", () => {
    expect(quoteInArticle("beans", article)).toBe(false);
  });
});

describe("unsupportedNumbers", () => {
  it("passes numbers that the evidence states", () => {
    expect(unsupportedNumbers("It has 1,200 islands", "The country has 1200 islands")).toEqual([]);
  });

  it("returns numbers the fact invents", () => {
    expect(unsupportedNumbers("It was built in 1889 and is 300 m tall", "It was built in 1889")).toEqual(["300"]);
  });
});

describe("timeRelativeWords and shapeIssue", () => {
  it("flags wording that goes out of date", () => {
    expect(timeRelativeWords("It is currently the tallest")).toBe("currently");
    expect(timeRelativeWords("Deliveries are still made by donkey")).toBe("still");
    expect(timeRelativeWords("It was completed in 1889")).toBeNull();
  });

  it("flags facts that would not read well in the recap", () => {
    expect(shapeIssue("x".repeat(300))).toMatch(/longer/);
    expect(shapeIssue("See https://example.com for more")).toMatch(/link/);
    expect(shapeIssue("One. Two. Three. Four.")).toMatch(/sentences/);
    expect(shapeIssue("A short, plain sentence.")).toBeNull();
  });
});
