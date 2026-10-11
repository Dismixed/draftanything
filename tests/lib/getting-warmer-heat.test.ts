import { describe, expect, it } from "vitest";
import { heatReading } from "@/lib/getting-warmer/heat";

describe("Getting Warmer heat", () => {
  it("starts cold with the two opening clues", () => {
    expect(heatReading(2, 5, false)).toEqual({ level: 0, label: "Cold", fraction: 0, bonus: 0 });
  });

  it("climbs one step per clue across a five-clue puzzle", () => {
    expect(heatReading(3, 5, false).label).toBe("Lukewarm");
    expect(heatReading(4, 5, false).label).toBe("Warm");
    expect(heatReading(5, 5, false).label).toBe("Hot");
  });

  it("reaches Hot on the last written clue however many there are", () => {
    expect(heatReading(8, 8, false).label).toBe("Hot");
    expect(heatReading(3, 3, false).label).toBe("Hot");
    expect(heatReading(5, 8, false).label).toBe("Warm");
  });

  it("keeps On fire for a solve", () => {
    for (let clues = 2; clues < 60; clues++) {
      expect(heatReading(clues, 5, false).label).not.toBe("On fire");
    }
    expect(heatReading(4, 5, true)).toEqual({ level: 4, label: "On fire", fraction: 1, bonus: 0 });
  });

  it("counts hints past the written clues and never fills the thermometer", () => {
    expect(heatReading(6, 5, false)).toMatchObject({ label: "Hot", bonus: 1 });
    expect(heatReading(9, 5, false).bonus).toBe(4);

    let previous = heatReading(5, 5, false).fraction;
    for (let clues = 6; clues < 200; clues++) {
      const { fraction } = heatReading(clues, 5, false);
      expect(fraction).toBeGreaterThanOrEqual(previous);
      expect(fraction).toBeLessThan(1);
      previous = fraction;
    }
    expect(heatReading(10, 5, false).fraction).toBeGreaterThan(heatReading(6, 5, false).fraction);
  });

  it("only ever rises as clues are revealed", () => {
    let previous = -1;
    for (let clues = 2; clues <= 12; clues++) {
      const { fraction } = heatReading(clues, 7, false);
      expect(fraction).toBeGreaterThanOrEqual(previous);
      previous = fraction;
    }
  });

  it("copes with a puzzle that has no clues beyond the opening pair", () => {
    expect(heatReading(2, 2, false).label).toBe("Cold");
    expect(heatReading(3, 2, false)).toMatchObject({ label: "Hot", bonus: 1 });
  });
});
