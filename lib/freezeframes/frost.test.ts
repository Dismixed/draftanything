import { describe, expect, it } from "vitest";
import { MAX_PTS } from "./game-logic";
import { frostLevel } from "./frost";

describe("frostLevel", () => {
  it("is clear with every point still available", () => {
    expect(frostLevel(MAX_PTS)).toBe(0);
  });

  it("is fully frozen once the round is down to its floor of 50 points", () => {
    expect(frostLevel(50)).toBe(1);
    expect(frostLevel(0)).toBe(1);
  });

  it("freezes steadily in between", () => {
    expect(frostLevel(525)).toBeCloseTo(0.5, 5);
    expect(frostLevel(800)).toBeLessThan(frostLevel(400));
  });

  it("starts part frozen when a written clue has capped the round", () => {
    expect(frostLevel(700)).toBeGreaterThan(0.3);
  });

  it("never leaves the range, whatever it is given", () => {
    expect(frostLevel(5000)).toBe(0);
    expect(frostLevel(-20)).toBe(1);
  });
});
