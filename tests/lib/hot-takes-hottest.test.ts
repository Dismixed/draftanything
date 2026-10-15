import { describe, expect, it } from "vitest";
import { rankTakes, type TierDistribution } from "@/lib/hot-takes/hottest";

const dist = (s: number, a: number, b: number, c: number, d: number): TierDistribution => ({ S: s, A: a, B: b, C: c, D: d });

const items = [
  { id: "a", label: "Alpha" },
  { id: "b", label: "Bravo" },
  { id: "c", label: "Charlie" },
  { id: "d", label: "Delta" },
];

const consensus = {
  a: dist(60, 20, 10, 5, 5),
  b: dist(5, 10, 20, 25, 40),
  c: dist(20, 20, 20, 20, 20),
  d: dist(10, 30, 30, 20, 10),
};

describe("rankTakes", () => {
  it("sorts every take by how few people agree, hottest first", () => {
    const { rows } = rankTakes(items, { a: "S", b: "S", c: "C", d: "D" }, consensus);
    expect(rows.map((r) => [r.item.id, r.tier, r.agree])).toEqual([
      ["b", "S", 5],
      ["d", "D", 10],
      ["c", "C", 20],
      ["a", "S", 60],
    ]);
  });

  it("keeps item order for ties", () => {
    const { rows } = rankTakes(items, { a: "D", b: "S", c: "C", d: "S" }, consensus);
    expect(rows.slice(0, 3).map((r) => r.item.id)).toEqual(["a", "b", "d"]);
  });

  it("returns the three hottest and says whether any of them are really hot", () => {
    const hot = rankTakes(items, { a: "S", b: "S", c: "C", d: "D" }, consensus);
    expect(hot.hottest.map((r) => r.item.id)).toEqual(["b", "d", "c"]);
    expect(hot.withCrowd).toBe(false);

    const mild = rankTakes(items.slice(0, 1), { a: "S" }, consensus);
    expect(mild.hottest.map((r) => r.item.id)).toEqual(["a"]);
    expect(mild.withCrowd).toBe(true);
  });
});
