import { describe, it, expect } from "vitest";
import { computeTopUndraftedPick } from "./top-undrafted-pick";

describe("computeTopUndraftedPick", () => {
  const rubric = [{ key: "quality", weight: 100 }];

  it("returns the highest-scoring available item", () => {
    const result = computeTopUndraftedPick(
      [
        {
          id: "item-1",
          name: "The Wire",
          is_available: true,
          hidden_metadata: { quality: 8 },
        },
        {
          id: "item-2",
          name: "The Sopranos",
          is_available: true,
          hidden_metadata: { quality: 9 },
        },
        {
          id: "item-3",
          name: "Breaking Bad",
          is_available: false,
          hidden_metadata: { quality: 10 },
        },
      ],
      rubric,
      "pool",
    );

    expect(result).toBe("The Sopranos");
  });

  it("returns null when every item was drafted", () => {
    const result = computeTopUndraftedPick(
      [
        {
          id: "item-1",
          name: "The Wire",
          is_available: false,
          hidden_metadata: { quality: 8 },
        },
      ],
      rubric,
      "pool",
    );

    expect(result).toBeNull();
  });

  it("returns null for off-the-dome drafts", () => {
    const result = computeTopUndraftedPick(
      [],
      rubric,
      "off_the_dome",
    );

    expect(result).toBeNull();
  });

  it("returns null when rubric is empty", () => {
    const result = computeTopUndraftedPick(
      [
        {
          id: "item-1",
          name: "The Wire",
          is_available: true,
          hidden_metadata: { quality: 8 },
        },
      ],
      [],
      "pool",
    );

    expect(result).toBeNull();
  });
});
