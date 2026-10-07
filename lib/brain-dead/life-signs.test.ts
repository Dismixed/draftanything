import { describe, expect, it } from "vitest";
import { lifeSignsTier, nextMilestone, tracePath, traceSeconds, LIFE_SIGNS_LABELS } from "./life-signs";

describe("lifeSignsTier", () => {
  it("is flat at zero and steps up at 1, 3, 5, 8 and 12", () => {
    expect([0, 1, 2, 3, 4, 5, 7, 8, 11, 12, 30].map(lifeSignsTier)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });

  it("has a label for every tier", () => {
    expect(LIFE_SIGNS_LABELS).toHaveLength(6);
    expect(LIFE_SIGNS_LABELS[0]).toBe("Flatline");
  });
});

describe("nextMilestone", () => {
  it("names the next step up and how far away it is", () => {
    expect(nextMilestone(0)).toEqual({ at: 1, label: "Signs of life" });
    expect(nextMilestone(6)).toEqual({ at: 8, label: "Big brain energy" });
  });

  it("has nothing left to chase past the last one", () => {
    expect(nextMilestone(12)).toBeNull();
  });
});

describe("tracePath", () => {
  it("is a straight line when there is no streak", () => {
    expect(tracePath(0)).toBe("M0 48 L2000 48");
  });

  it("gets taller and busier as the streak grows", () => {
    const peak = (d: string) => Math.max(...(d.match(/ (\d+(?:\.\d+)?)(?= L|$)/g) ?? []).map((n) => Math.abs(Number(n) - 48)));
    expect(peak(tracePath(8))).toBeGreaterThan(peak(tracePath(2)));
    expect(tracePath(8).length).toBeGreaterThan(tracePath(2).length);
  });

  it("stays inside the strip however long the streak", () => {
    const ys = (tracePath(500).match(/ (-?\d+(?:\.\d+)?)(?= L|$)/g) ?? []).map(Number);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(2);
    expect(Math.max(...ys)).toBeLessThanOrEqual(94);
  });

  it("repeats exactly halfway so it can scroll in a loop", () => {
    const points = tracePath(5).split(" L").slice(1, -1).map((p) => p.split(" ").map(Number));
    const half = points.length / 2;
    expect(points[half][0] - points[0][0]).toBeCloseTo(1000, 3);
    expect(points[half][1]).toBeCloseTo(points[0][1], 3);
  });
});

describe("traceSeconds", () => {
  it("scrolls faster as the streak grows, down to a floor", () => {
    expect(traceSeconds(8)).toBeLessThan(traceSeconds(1));
    expect(traceSeconds(500)).toBe(traceSeconds(100));
  });
});
