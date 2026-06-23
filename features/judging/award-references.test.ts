import { describe, expect, it } from "vitest";
import {
  normalizeAwardRef,
  readAwardRef,
  resolveAwardItemName,
  resolvePickForAward,
} from "./award-references";

const picks = [
  {
    id: "pick-1",
    playerId: "player-1",
    itemId: "",
    itemName: "LeBron James",
    overallPick: 1,
  },
  {
    id: "pick-2",
    playerId: "player-2",
    itemId: "item-2",
    itemName: null,
    overallPick: 2,
  },
];

describe("award references", () => {
  it("reads snake_case award fields", () => {
    expect(
      readAwardRef({
        pick_id: "pick-1",
        item_id: "",
        player_id: "player-1",
      }),
    ).toEqual({
      pickId: "pick-1",
      itemId: "",
      playerId: "player-1",
    });
  });

  it("resolves off-the-dome picks by pickId", () => {
    const award = { pickId: "pick-1", itemId: "", playerId: "player-1" };
    expect(resolvePickForAward(award, picks)?.itemName).toBe("LeBron James");
  });

  it("resolves off-the-dome picks when AI puts the name in itemId", () => {
    const award = { pickId: "wrong", itemId: "LeBron James", playerId: "player-1" };
    expect(resolvePickForAward(award, picks)?.id).toBe("pick-1");
  });

  it("normalizes invalid pickIds onto real picks", () => {
    expect(
      normalizeAwardRef(
        { pickId: "wrong", itemId: "LeBron James", playerId: "player-1" },
        picks,
      ),
    ).toEqual({
      pickId: "pick-1",
      itemId: "",
      playerId: "player-1",
    });
  });

  it("resolves pool picks by itemId", () => {
    const itemNameById = new Map([["item-2", "The Wire"]]);
    expect(
      resolveAwardItemName(
        { pickId: "", itemId: "item-2", playerId: "player-2" },
        picks,
        itemNameById,
      ),
    ).toBe("The Wire");
  });
});
