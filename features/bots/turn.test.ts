import { describe, expect, it } from "vitest";
import { planBotTurn, type BotTurnState } from "./turn";

const base = (over: Partial<BotTurnState["draft"]> = {}): BotTurnState => ({
  draft: {
    id: "draft-1",
    phase: "DRAFTING",
    topic: "Best snacks",
    pickingMode: "pool",
    currentPickIndex: 1,
    pickOrder: [
      { seat: 1, overallPick: 1 },
      { seat: 2, overallPick: 2 },
      { seat: 3, overallPick: 3 },
      { seat: 2, overallPick: 4 },
    ],
    rubric: { taste: 50, crunch: 50 },
    vetoedNames: [],
    ...over,
  },
  players: [
    { id: "human", seat: 1, isBot: false, botStyle: null },
    { id: "chalk", seat: 2, isBot: true, botStyle: "chalk" },
    { id: "hip", seat: 3, isBot: true, botStyle: "hipster" },
  ],
  picks: [{ playerId: "human", itemId: "i1", itemName: null, forfeited: false }],
  items: [
    { id: "i1", name: "Crisps", isAvailable: false, scores: { taste: 10, crunch: 10 } },
    { id: "i2", name: "Pretzels", isAvailable: true, scores: { taste: 6, crunch: 9 } },
    { id: "i3", name: "Popcorn", isAvailable: true, scores: { taste: 8, crunch: 8 } },
    { id: "i4", name: "Raisins", isAvailable: true, scores: { taste: 3, crunch: 1 } },
  ],
});

describe("planBotTurn", () => {
  it("is stale when the turn has moved on", () => {
    expect(planBotTurn(base(), 0)).toEqual({ kind: "stale" });
    expect(planBotTurn(base({ currentPickIndex: 2 }), 1)).toEqual({ kind: "stale" });
  });

  it("is stale outside drafting, and when the draft is over", () => {
    expect(planBotTurn(base({ phase: "VETO_VOTING" }), 1)).toEqual({ kind: "stale" });
    expect(planBotTurn(base({ currentPickIndex: 4 }), 4)).toEqual({ kind: "stale" });
  });

  it("never plans a pick for a human's seat", () => {
    expect(planBotTurn(base({ currentPickIndex: 0 }), 0)).toEqual({ kind: "stale" });
  });

  it("picks from available pool items only, by the drafter's style", () => {
    const plan = planBotTurn(base(), 1);
    expect(plan).toMatchObject({ kind: "pool", itemId: "i3" });
    if (plan.kind === "pool") expect(plan.bot.style).toBe("chalk");
  });

  it("forfeits if the pool is somehow empty", () => {
    const state = base();
    state.items.forEach((item) => (item.isAvailable = false));
    expect(planBotTurn(state, 1)).toMatchObject({ kind: "forfeit" });
  });

  it("gives the same pool pick when asked twice", () => {
    const state = base({ currentPickIndex: 2 });
    expect(planBotTurn(state, 2)).toEqual(planBotTurn(state, 2));
  });

  it("hands Off the Dome the taken names, own lineup and vetoed names", () => {
    const state = base({
      pickingMode: "off_the_dome",
      currentPickIndex: 3,
      vetoedNames: ["Gravel"],
    });
    state.picks = [
      { playerId: "human", itemId: null, itemName: "Crisps", forfeited: false },
      { playerId: "chalk", itemId: null, itemName: "Popcorn", forfeited: false },
      { playerId: "hip", itemId: null, itemName: null, forfeited: true },
    ];

    const plan = planBotTurn(state, 3);
    expect(plan.kind).toBe("dome");
    if (plan.kind === "dome") {
      expect(plan.input).toMatchObject({
        topic: "Best snacks",
        takenNames: ["Crisps", "Popcorn"],
        ownLineup: ["Popcorn"],
        vetoedNames: ["Gravel"],
      });
      expect(plan.bot.style).toBe("chalk");
    }
  });
});
