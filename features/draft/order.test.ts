import { describe, expect, it } from "vitest";

import { buildPickOrder, seededRandom } from "./order";

describe("buildPickOrder", () => {
  it.each([
    [1, 1],
    [7, 1],
    [2.5, 1],
    [2, 0],
    [2, 11],
    [2, 1.5],
  ])("rejects invalid players=%s rounds=%s", (players, rounds) => {
    expect(() =>
      buildPickOrder(players, rounds, "standard", seededRandom("invalid")),
    ).toThrow();
  });

  it("builds a standard order with complete one-based slots", () => {
    expect(buildPickOrder(3, 2, "standard", seededRandom("unused"))).toEqual([
      { overallPick: 1, round: 1, pickInRound: 1, seat: 1 },
      { overallPick: 2, round: 1, pickInRound: 2, seat: 2 },
      { overallPick: 3, round: 1, pickInRound: 3, seat: 3 },
      { overallPick: 4, round: 2, pickInRound: 1, seat: 1 },
      { overallPick: 5, round: 2, pickInRound: 2, seat: 2 },
      { overallPick: 6, round: 2, pickInRound: 3, seat: 3 },
    ]);
  });

  it("reverses seats on even snake rounds", () => {
    const order = buildPickOrder(3, 3, "snake", seededRandom("unused"));

    expect(order.map(({ seat }) => seat)).toEqual([
      1, 2, 3, 3, 2, 1, 1, 2, 3,
    ]);
  });

  it("independently shuffles every random round without missing seats", () => {
    const order = buildPickOrder(4, 3, "random", seededRandom("rounds"));

    for (let round = 1; round <= 3; round += 1) {
      const seats = order
        .filter((slot) => slot.round === round)
        .map((slot) => slot.seat)
        .sort((left, right) => left - right);
      expect(seats).toEqual([1, 2, 3, 4]);
    }
  });

  it("reproduces random orders for the same seed and changes for another", () => {
    const first = buildPickOrder(6, 10, "random", seededRandom("same"));
    const second = buildPickOrder(6, 10, "random", seededRandom("same"));
    const different = buildPickOrder(
      6,
      10,
      "random",
      seededRandom("different"),
    );

    expect(first).toEqual(second);
    expect(different).not.toEqual(first);
  });

  it("covers every overall position exactly once at both boundaries", () => {
    for (const [players, rounds] of [
      [2, 1],
      [6, 10],
    ] as const) {
      const order = buildPickOrder(
        players,
        rounds,
        "snake",
        seededRandom("coverage"),
      );
      expect(order.map(({ overallPick }) => overallPick)).toEqual(
        Array.from({ length: players * rounds }, (_, index) => index + 1),
      );
      expect(new Set(order.map(({ overallPick }) => overallPick)).size).toBe(
        players * rounds,
      );
    }
  });

  it("returns an immutable stored sequence", () => {
    const order = buildPickOrder(2, 1, "random", seededRandom("immutable"));

    expect(Object.isFrozen(order)).toBe(true);
    expect(order.every(Object.isFrozen)).toBe(true);
  });
});
