import { describe, expect, it } from "vitest";
import { lastUsedBefore, orderByLru, pickLru } from "./lru";

const key = (s: string) => s;

describe("orderByLru", () => {
  it("puts never-used items first, in pool order", () => {
    const items = ["a", "b", "c"];
    const lastUsed = new Map<string, string | null>([
      ["a", null],
      ["b", null],
      ["c", null],
    ]);

    expect(orderByLru(items, key, lastUsed)).toEqual(["a", "b", "c"]);
  });

  it("orders used items by oldest last-used date ascending", () => {
    const items = ["a", "b", "c", "d"];
    const lastUsed = new Map<string, string | null>([
      ["a", "2026-08-20"],
      ["b", "2026-08-10"],
      ["c", "2026-08-15"],
      ["d", null],
    ]);

    // "d" never used first; then b (10th), c (15th), a (20th).
    expect(orderByLru(items, key, lastUsed)).toEqual(["d", "b", "c", "a"]);
  });

  it("treats a missing key as never used", () => {
    const items = ["a", "b"];
    const lastUsed = new Map<string, string | null>([["a", "2026-08-01"]]);

    expect(orderByLru(items, key, lastUsed)).toEqual(["b", "a"]);
  });

  it("keeps stable order for ties on the same date", () => {
    const items = ["a", "b", "c"];
    const lastUsed = new Map<string, string | null>([
      ["a", "2026-08-01"],
      ["b", "2026-08-01"],
      ["c", null],
    ]);

    expect(orderByLru(items, key, lastUsed)).toEqual(["c", "a", "b"]);
  });

  it("returns an empty array for an empty pool", () => {
    expect(orderByLru([], key, new Map())).toEqual([]);
  });
});

describe("pickLru", () => {
  it("returns the first item of the LRU order", () => {
    const items = ["a", "b", "c"];
    const lastUsed = new Map<string, string | null>([
      ["a", "2026-08-20"],
      ["b", null],
      ["c", "2026-08-10"],
    ]);

    expect(pickLru(items, key, lastUsed)).toBe("b");
  });

  it("returns null for an empty pool", () => {
    expect(pickLru([], key, new Map())).toBeNull();
  });
});

describe("lastUsedBefore", () => {
  it("keeps the latest date per key, ignoring rows on or after the target date", () => {
    const map = lastUsedBefore(
      [
        { key: "a", date: "2026-10-01" },
        { key: "a", date: "2026-10-09" },
        { key: "b", date: "2026-10-20" },
      ],
      "2026-10-16",
    );
    expect(map.get("a")).toBe("2026-10-09");
    expect(map.has("b")).toBe(false);
  });
});
