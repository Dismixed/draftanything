import { describe, expect, it } from "vitest";
import { dedupeItemSlugs } from "@/lib/hot-takes/seed-db";

describe("dedupeItemSlugs", () => {
  it("leaves unique slugs unchanged", () => {
    const items = [{ slug: "a" }, { slug: "b" }, { slug: "c" }];

    expect(dedupeItemSlugs(items)).toEqual(items);
  });

  it("appends -2 to the second duplicate, preserving order and fields", () => {
    const items = [
      { slug: "bacon", label: "Bacon" },
      { slug: "eggs", label: "Eggs" },
      { slug: "bacon", label: "Turkey Bacon" },
    ];

    const result = dedupeItemSlugs(items);

    expect(result.map((i) => i.slug)).toEqual(["bacon", "eggs", "bacon-2"]);
    expect(result[2].label).toBe("Turkey Bacon");
  });

  it("handles three or more duplicates with incrementing suffixes", () => {
    const items = [
      { slug: "x" },
      { slug: "x" },
      { slug: "x" },
      { slug: "x" },
    ];

    expect(dedupeItemSlugs(items).map((i) => i.slug)).toEqual([
      "x",
      "x-2",
      "x-3",
      "x-4",
    ]);
  });

  it("avoids colliding with an already-present suffixed slug", () => {
    const items = [
      { slug: "x" },
      { slug: "x-2" },
      { slug: "x" },
    ];

    expect(dedupeItemSlugs(items).map((i) => i.slug)).toEqual([
      "x",
      "x-2",
      "x-3",
    ]);
  });
});
