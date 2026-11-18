import { describe, expect, it } from "vitest";
import { BANK, CATEGORIES, TREASURE } from "./bank";
import { legsFor, treasureFor } from "./daily-service";
import { buildFleet, MIN_PLAYERS, SIMULATED_SAILORS, simulatedVoyages } from "./fleet";
import { LEGS, PAR } from "./scoring";
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

describe("the treasure questions", () => {
  it("never repeat a question from the categories", () => {
    const ids = new Set(all.map((q) => q.id));
    const prompts = new Set(all.map((q) => q.prompt));
    for (const q of TREASURE) {
      expect(ids.has(q.id), q.id).toBe(false);
      expect(prompts.has(q.prompt), q.prompt).toBe(false);
      expect(q.answer, q.id).toBeGreaterThan(0);
    }
    expect(new Set(TREASURE.map((q) => q.id)).size).toBe(TREASURE.length);
  });

  it("gives every day one, the same for everyone", () => {
    expect(treasureFor("2026-11-17")).toEqual(treasureFor("2026-11-17"));
    expect(treasureFor("2026-11-17").id).not.toBe(treasureFor("2026-11-18").id);
    expect(treasureFor("2026-11-10").category).toBe("treasure");
  });
});

describe("the fleet", () => {
  const legs = [...legsFor("2026-11-16"), treasureFor("2026-11-16")];

  it("is the same simulated fleet for everyone on a day", () => {
    expect(simulatedVoyages("2026-11-16", legs, 5)).toEqual(simulatedVoyages("2026-11-16", legs, 5));
  });

  it("tops up with estimates until enough people have played", () => {
    // A perfect voyage: seven Dead Reckonings, then the treasure too.
    const real = [legs.map((l) => l.answer)];
    const few = buildFleet("2026-11-16", legs, real);
    expect(few.source).toBe("estimate");
    expect(few.players).toBe(1);
    expect(few.days.length).toBeGreaterThan(1);
    expect(few.days).toContain(5);

    const many = buildFleet("2026-11-16", legs, Array.from({ length: MIN_PLAYERS }, () => legs.map((l) => l.answer)));
    expect(many.source).toBe("players");
    expect(many.days).toHaveLength(MIN_PLAYERS);
    expect(many.guesses).toHaveLength(LEGS + 1);
  });

  it("puts an average voyage well over par, with few reaching the treasure island", () => {
    const fleet = buildFleet("2026-11-16", legs, []);
    const avg = fleet.days.reduce((s, d) => s + d, 0) / fleet.days.length;
    expect(avg).toBeGreaterThan(PAR);
    expect(avg).toBeLessThan(30);
    const reached = simulatedVoyages("2026-11-16", legs).filter((v) => v.length > LEGS).length;
    expect(reached).toBeGreaterThan(0);
    expect(reached).toBeLessThan(SIMULATED_SAILORS / 4);
  });
});
