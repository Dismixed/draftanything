import { describe, expect, it } from "vitest";
import { applyReview, type Review } from "./review";

const link = (word_a: string, word_b: string, familiarity: number) => ({
  word_a,
  word_b,
  familiarity,
  count: 10,
});

describe("applyReview", () => {
  const links = [link("hot", "dog", 5), link("file", "server", 4), link("door", "man", 5)];

  it("drops links the review marked for removal", () => {
    const review: Review = { "file server": { action: "remove", reason: "jargon" } };
    expect(applyReview(links, review).map((l) => `${l.word_a} ${l.word_b}`)).toEqual([
      "hot dog",
      "door man",
    ]);
  });

  it("replaces the familiarity of links the review rescored", () => {
    const review: Review = { "door man": { action: "rescore", familiarity: 4 } };
    expect(applyReview(links, review).find((l) => l.word_a === "door")).toEqual(
      link("door", "man", 4),
    );
  });

  it("leaves links the review does not mention unchanged", () => {
    expect(applyReview(links, {})).toEqual(links);
  });

  it("does not modify the links it was given", () => {
    applyReview(links, { "door man": { action: "rescore", familiarity: 3 } });
    expect(links[2].familiarity).toBe(5);
  });
});
