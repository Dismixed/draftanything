import { describe, expect, it } from "vitest";
import { resolveSsFetchCategory, resolveWagerTopicHint } from "./topic-hint";

describe("resolveSsFetchCategory", () => {
  it("omits the API filter for general so every category is used", () => {
    expect(resolveSsFetchCategory("general")).toBeNull();
  });

  it("passes through specific categories", () => {
    expect(resolveSsFetchCategory("sports")).toBe("sports");
  });
});

describe("resolveWagerTopicHint", () => {
  it("uses API category for general games", () => {
    expect(
      resolveWagerTopicHint("general", {
        cat: "Film & TV",
        topic: "Horror Classics",
      }),
    ).toBe("Film & TV");
  });

  it("uses AI topic for category-specific games", () => {
    expect(
      resolveWagerTopicHint("sports", {
        cat: "Sports",
        topic: "NBA Basketball",
      }),
    ).toBe("NBA Basketball");
  });

  it("falls back to category name when topic is missing", () => {
    expect(
      resolveWagerTopicHint("movies", {
        cat: "Film & TV",
      }),
    ).toBe("Movies");
  });
});
