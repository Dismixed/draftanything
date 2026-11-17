import { describe, expect, it } from "vitest";
import { BANK, CATEGORIES } from "./bank";
import { legsFor } from "./daily-service";
import { buildFleet, MIN_PLAYERS, simulatedVoyages } from "./fleet";
import { LEGS } from "./scoring";
import { voyageNumber } from "./voyage";

const all = CATEGORIES.flatMap((c) => BANK[c]);

describe("the bank", () => {
  it("has a list for every leg", () => {
    expect(CATEGORIES).toHaveLength(LEGS);
    for (const c of CATEGORIES) expect(BANK[c].length).toBeGreaterThanOrEqual(10);
  });

  it("has unique ids and complete questions", () => {
    expect(new Set(all.map((q) => q.id)).size).toBe(all.length);
    for (const q of all) {
      expect(q.answer, q.id).toBeGreaterThan(0);
      expect(q.prompt.endsWith("?"), q.id).toBe(true);
      for (const field of [q.unit, q.clue, q.fact, q.source]) expect(field.length, q.id).toBeGreaterThan(0);
    }
  });
});

describe("the day's voyage", () => {
  it("is seven legs in category order, the same for a given date", () => {
    const legs = legsFor("2026-11-16");
    expect(legs.map((l) => l.category)).toEqual([...CATEGORIES]);
    expect(legsFor("2026-11-16")).toEqual(legs);
    expect(legsFor("2026-11-17")[0].id).not.toBe(legs[0].id);
  });

  it("numbers voyages from launch day", () => {
    expect(voyageNumber("2026-11-16")).toBe(1);
    expect(voyageNumber("2026-12-01")).toBe(16);
  });
});

describe("the fleet", () => {
  const legs = legsFor("2026-11-16");

  it("is the same simulated fleet for everyone on a day", () => {
    expect(simulatedVoyages("2026-11-16", legs, 5)).toEqual(simulatedVoyages("2026-11-16", legs, 5));
  });

  it("tops up with estimates until enough people have played", () => {
    const real = [legs.map((l) => l.answer)];
    const few = buildFleet("2026-11-16", legs, real);
    expect(few.source).toBe("estimate");
    expect(few.players).toBe(1);
    expect(few.days.length).toBeGreaterThan(1);
    expect(few.days).toContain(7);

    const many = buildFleet("2026-11-16", legs, Array.from({ length: MIN_PLAYERS }, () => legs.map((l) => l.answer)));
    expect(many.source).toBe("players");
    expect(many.days).toHaveLength(MIN_PLAYERS);
    expect(many.guesses).toHaveLength(LEGS);
  });

  it("puts an average voyage well over par", () => {
    const fleet = buildFleet("2026-11-16", legs, []);
    const avg = fleet.days.reduce((s, d) => s + d, 0) / fleet.days.length;
    expect(avg).toBeGreaterThan(10);
    expect(avg).toBeLessThan(22);
  });
});
