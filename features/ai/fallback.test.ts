import { describe, expect, it } from "vitest";

import {
  deriveAwards,
  fallbackJudge,
  rosterScore,
  selectAutoPick,
  weightedItemScore,
  type DraftItem,
  type RosterPick,
  type RubricCategory,
} from "./fallback";

const rubric: RubricCategory[] = [
  { key: "quality", weight: 60 },
  { key: "fit", weight: 40 },
];

const item = (
  id: string,
  name: string,
  quality: number,
  fit: number,
  available = true,
): DraftItem => ({
  id,
  name,
  available,
  metadata: { quality, fit },
});

const pick = (
  pickId: string,
  playerId: string,
  draftItem: DraftItem,
  overallPick: number,
): RosterPick => ({
  pickId,
  playerId,
  itemId: draftItem.id,
  itemName: draftItem.name,
  metadata: draftItem.metadata,
  overallPick,
});

describe("weightedItemScore", () => {
  it("computes a 0..10 weighted score", () => {
    expect(
      weightedItemScore({ quality: 8, fit: 5 }, rubric),
    ).toBe(6.8);
  });

  it("rejects missing metadata keys", () => {
    expect(() => weightedItemScore({ quality: 8 }, rubric)).toThrow(
      /metadata/i,
    );
  });

  it.each([
    [
      [
        { key: "quality", weight: 50 },
        { key: "fit", weight: 40 },
      ],
    ],
    [
      [
        { key: "quality", weight: -10 },
        { key: "fit", weight: 110 },
      ],
    ],
    [[{ key: "quality", weight: Number.NaN }]],
    [
      [
        { key: "quality", weight: 50 },
        { key: "quality", weight: 50 },
      ],
    ],
  ])("rejects invalid rubric %j", (invalidRubric) => {
    expect(() =>
      weightedItemScore({ quality: 8, fit: 5 }, invalidRubric),
    ).toThrow(/rubric/i);
  });

  it.each([
    { quality: -1, fit: 5 },
    { quality: 11, fit: 5 },
    { quality: Number.POSITIVE_INFINITY, fit: 5 },
  ])("rejects invalid metadata %j", (metadata) => {
    expect(() => weightedItemScore(metadata, rubric)).toThrow(/metadata/i);
  });
});

describe("selectAutoPick", () => {
  it("excludes unavailable items", () => {
    expect(
      selectAutoPick(
        [
          item("best", "Best", 10, 10, false),
          item("next", "Next", 8, 8),
        ],
        rubric,
      ).id,
    ).toBe("next");
  });

  it("rejects an empty available list", () => {
    expect(() =>
      selectAutoPick([item("gone", "Gone", 10, 10, false)], rubric),
    ).toThrow(/available/i);
  });

  it("breaks score ties by normalized name then stable id", () => {
    const items = [
      item("z", "Beta", 8, 8),
      item("z-id", "Alpha!", 8, 8),
      item("a-id", " alpha ", 8, 8),
    ];

    expect(selectAutoPick(items, rubric).id).toBe("a-id");
  });
});

describe("rosterScore", () => {
  it("averages weighted item scores", () => {
    expect(
      rosterScore(
        [
          pick("pick-1", "p1", item("a", "A", 10, 10), 1),
          pick("pick-2", "p1", item("b", "B", 4, 4), 2),
        ],
        rubric,
      ),
    ).toBe(7);
  });

  it("rejects an empty roster", () => {
    expect(() => rosterScore([], rubric)).toThrow(/roster/i);
  });
});

describe("deriveAwards", () => {
  it("references actual IDs and uses weighted score minus linear pick expectation for steals", () => {
    const picks = [
      pick("pick-1", "p1", item("a", "Alpha", 9, 9), 1),
      pick("pick-2", "p2", item("b", "Beta", 2, 2), 2),
      pick("pick-3", "p1", item("c", "Gamma", 8, 8), 3),
    ];

    expect(deriveAwards(picks, rubric)).toEqual({
      bestPick: { pickId: "pick-1", itemId: "a", playerId: "p1" },
      worstPick: { pickId: "pick-2", itemId: "b", playerId: "p2" },
      biggestSteal: { pickId: "pick-3", itemId: "c", playerId: "p1" },
    });
  });

  it("orders every award tie by normalized item name then id", () => {
    const tied = [
      pick("pick-z", "p1", item("z", "Alpha!", 5, 5), 1),
      pick("pick-a", "p2", item("a", " alpha ", 5, 5), 1),
    ];

    expect(deriveAwards(tied, rubric)).toEqual({
      bestPick: { pickId: "pick-a", itemId: "a", playerId: "p2" },
      worstPick: { pickId: "pick-a", itemId: "a", playerId: "p2" },
      biggestSteal: { pickId: "pick-a", itemId: "a", playerId: "p2" },
    });
  });
});

describe("fallbackJudge", () => {
  it("returns roster scores, shared winners, and deterministic awards", () => {
    const picks = [
      pick("pick-1", "p1", item("a", "Alpha", 8, 8), 1),
      pick("pick-2", "p2", item("b", "Beta", 8, 8), 2),
    ];

    expect(fallbackJudge(["p1", "p2"], picks, rubric)).toEqual({
      rosterScores: { p1: 8, p2: 8 },
      winnerIds: ["p1", "p2"],
      awards: {
        bestPick: { pickId: "pick-1", itemId: "a", playerId: "p1" },
        worstPick: { pickId: "pick-1", itemId: "a", playerId: "p1" },
        biggestSteal: { pickId: "pick-2", itemId: "b", playerId: "p2" },
      },
    });
  });
});
