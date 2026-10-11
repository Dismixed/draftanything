import { describe, expect, it } from "vitest";
import { seededRandom } from "@/features/draft/order";
import {
  compositeScore,
  pickFromPool,
  specialistCategory,
  type PoolPickInput,
  type ScoredItem,
} from "./pool-pick";
import { BOT_ROSTER, type BotStyle } from "./roster";

const rubric = { fame: 50, skill: 50 };

const A: ScoredItem = { id: "a", name: "A", scores: { fame: 9, skill: 9 } };
const B: ScoredItem = { id: "b", name: "B", scores: { fame: 10, skill: 2 } };
const C: ScoredItem = { id: "c", name: "C", scores: { fame: 6, skill: 6.5 } };
const D: ScoredItem = { id: "d", name: "D", scores: { fame: 3, skill: 3 } };
const E: ScoredItem = { id: "e", name: "E", scores: {} };
const F: ScoredItem = { id: "f", name: "F", scores: { fame: 1, skill: 1 } };
const ALL = [F, E, D, C, B, A];

const input = (over: Partial<PoolPickInput>): PoolPickInput => ({
  style: "chalk",
  available: ALL,
  rubric,
  ownLineup: [],
  specialistKey: null,
  random: () => 0,
  ...over,
});

/** Chalk's full ordering, found by taking the best item repeatedly. */
const chalkOrder = (items: ScoredItem[]): string[] => {
  const left = [...items];
  const order: string[] = [];
  while (left.length > 0) {
    const pick = pickFromPool(input({ available: left }));
    order.push(pick.id);
    left.splice(left.indexOf(pick), 1);
  }
  return order;
};

describe("compositeScore", () => {
  it("is the rubric-weighted mean", () => {
    expect(compositeScore({ fame: 10, skill: 0 }, rubric)).toBe(5);
    expect(compositeScore({ fame: 10, skill: 0 }, { fame: 75, skill: 25 })).toBe(7.5);
  });

  it("is the plain mean when there is no rubric", () => {
    expect(compositeScore({ x: 4, y: 8 }, {})).toBe(6);
  });

  it("leaves out categories the item has no score for", () => {
    expect(compositeScore({ fame: 8 }, rubric)).toBe(8);
  });

  it("is NaN for an item with no scores", () => {
    expect(compositeScore({}, rubric)).toBeNaN();
  });
});

describe("specialistCategory", () => {
  it("is stable for a draft and seat, and null without a rubric", () => {
    expect(specialistCategory(rubric, "draft-1", 2)).toBe(
      specialistCategory(rubric, "draft-1", 2),
    );
    expect(Object.keys(rubric)).toContain(specialistCategory(rubric, "draft-1", 2));
    expect(specialistCategory({}, "draft-1", 2)).toBeNull();
  });
});

describe("pickFromPool", () => {
  it("chalk takes the highest overall score", () => {
    expect(pickFromPool(input({ style: "chalk" })).id).toBe("a");
  });

  it("ranks an unscored item at the median of the scored ones", () => {
    // Scored composites on the full board: A 9, C 6.25, B 6, D 3, F 1 → median 6,
    // so E sits level with B and after it by name: fourth overall.
    expect(pickFromPool(input({ style: "hipster" })).id).toBe("e");
    // Against D (3) and F (1) the median is 2: below D, above F.
    expect(pickFromPool(input({ available: [E, F, D] })).id).toBe("d");
    expect(pickFromPool(input({ available: [E, F] })).id).toBe("e");
    expect(chalkOrder([E, F, D])).toEqual(["d", "e", "f"]);
  });

  it("specialist weights its category three times as heavily", () => {
    const rounded: ScoredItem = { id: "x", name: "X", scores: { fame: 7, skill: 7 } };
    const famous: ScoredItem = { id: "y", name: "Y", scores: { fame: 10, skill: 1 } };
    const board = [rounded, famous];
    expect(pickFromPool(input({ available: board })).id).toBe("x");
    expect(
      pickFromPool(input({ style: "specialist", specialistKey: "fame", available: board })).id,
    ).toBe("y");
    expect(
      pickFromPool(input({ style: "specialist", specialistKey: "skill", available: board })).id,
    ).toBe("x");
  });

  it("specialist with no category behaves like chalk", () => {
    expect(pickFromPool(input({ style: "specialist", specialistKey: null })).id).toBe("a");
    expect(pickFromPool(input({ style: "specialist", specialistKey: "gone" })).id).toBe("a");
  });

  it("hipster skips the top three, unless three or fewer remain", () => {
    expect(pickFromPool(input({ style: "hipster", available: [D, C, A] })).id).toBe("a");
  });

  it("balancer takes the best overall first, then shores up its weakest category", () => {
    expect(pickFromPool(input({ style: "balancer" })).id).toBe("a");
    // Lineup of B is weak in skill; A has the most skill on the board.
    expect(
      pickFromPool(input({ style: "balancer", ownLineup: [B], available: [F, D, C, A] })).id,
    ).toBe("a");
    // Weak in fame: B has the most fame even though A is better overall.
    const weakFame: ScoredItem = { id: "z", name: "Z", scores: { fame: 1, skill: 9 } };
    expect(pickFromPool(input({ style: "balancer", ownLineup: [weakFame] })).id).toBe("b");
  });

  it("wildcard stays in the top half", () => {
    expect(pickFromPool(input({ style: "wildcard", random: () => 0 })).id).toBe("a");
    expect(pickFromPool(input({ style: "wildcard", random: () => 0.99 })).id).toBe("b");
    for (let i = 0; i < 20; i += 1) {
      const pick = pickFromPool(input({ style: "wildcard", random: () => i / 20 }));
      expect(["a", "c", "b"]).toContain(pick.id);
    }
  });

  it("every style copes with a pool that has no scores and no rubric", () => {
    const bare = [
      { id: "2", name: "Banana", scores: {} },
      { id: "1", name: "Apple", scores: {} },
      { id: "3", name: "Cherry", scores: {} },
    ];
    for (const { style } of BOT_ROSTER) {
      const pick = pickFromPool(
        input({ style, available: bare, rubric: {}, ownLineup: [bare[0]], random: () => 0.5 }),
      );
      expect(bare).toContain(pick);
    }
    expect(pickFromPool(input({ available: bare, rubric: {} })).name).toBe("Apple");
  });

  it("every style takes the only item left", () => {
    for (const { style } of BOT_ROSTER) {
      expect(
        pickFromPool(input({ style: style as BotStyle, available: [D], ownLineup: [A] })).id,
      ).toBe("d");
    }
  });

  it("is deterministic for a seeded random source", () => {
    const first = pickFromPool(input({ style: "wildcard", random: seededRandom("draft:7") }));
    const second = pickFromPool(input({ style: "wildcard", random: seededRandom("draft:7") }));
    expect(first.id).toBe(second.id);
  });

  it("refuses an empty board", () => {
    expect(() => pickFromPool(input({ available: [] }))).toThrow(RangeError);
  });
});
