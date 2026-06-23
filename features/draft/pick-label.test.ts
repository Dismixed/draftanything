import { describe, expect, it } from "vitest";
import type { SafeItem, SafePick } from "./types";
import { getPickItemLabel } from "./pick-label";

const basePick: SafePick = {
  id: "pick-1",
  playerId: "player-1",
  itemId: "",
  itemName: "LeBron James",
  overallPick: 1,
  round: 1,
  pickInRound: 1,
  isAutoPick: false,
  forfeited: false,
  vetoChallengeResolved: false,
};

describe("getPickItemLabel", () => {
  it("prefers itemName for off-the-dome picks", () => {
    expect(getPickItemLabel(basePick)).toBe("LeBron James");
  });

  it("falls back to pool item names", () => {
    const itemMap = new Map<string, SafeItem>([
      [
        "item-1",
        {
          id: "item-1",
          name: "Item Alpha",
          source: "ai",
          isAvailable: false,
        },
      ],
    ]);

    expect(
      getPickItemLabel(
        { ...basePick, itemName: null, itemId: "item-1" },
        itemMap,
      ),
    ).toBe("Item Alpha");
  });

  it("shows Forfeited for forfeited picks", () => {
    expect(getPickItemLabel({ ...basePick, forfeited: true })).toBe("Forfeited");
  });
});
