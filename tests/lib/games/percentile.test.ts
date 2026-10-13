import { describe, expect, it } from "vitest";
import {
  MIN_SAMPLE,
  axisLabels,
  clampPercentile,
  estimatedPercentile,
  measuredPercentile,
  percentileFor,
  zForPercentile,
} from "@/lib/games/percentile";

describe("clampPercentile", () => {
  it("never tells anyone they beat everyone or no one", () => {
    expect(clampPercentile(0)).toBe(1);
    expect(clampPercentile(100)).toBe(99);
    expect(clampPercentile(63.4)).toBe(63);
  });
});

describe("measuredPercentile", () => {
  it("is the share of other players who did strictly worse", () => {
    expect(measuredPercentile(5, 10)).toBe(50);
    expect(measuredPercentile(20, 29)).toBe(69);
  });

  it("is clamped at both ends", () => {
    expect(measuredPercentile(10, 10)).toBe(99);
    expect(measuredPercentile(0, 10)).toBe(1);
  });

  it("is the middle when the player is the only one", () => {
    expect(measuredPercentile(0, 0)).toBe(50);
  });
});

describe("estimatedPercentile", () => {
  it("puts the assumed average player in the middle", () => {
    expect(estimatedPercentile("brain-dead", 450, 1000)).toBe(50);
    expect(estimatedPercentile("ball-knowledge", 12, 200)).toBe(50);
    expect(estimatedPercentile("getting-warmer", 14, 500)).toBe(50);
  });

  it("never goes down as a higher-is-better score goes up", () => {
    for (const game of ["brain-dead", "anyguessr", "freezeframes", "ball-knowledge"] as const) {
      let last = 0;
      for (let score = 0; score <= 4000; score += 50) {
        const now = estimatedPercentile(game, score, 4000);
        expect(now, `${game} at ${score}`).toBeGreaterThanOrEqual(last);
        last = now;
      }
    }
  });

  it("rewards fewer guesses in Getting Warmer", () => {
    expect(estimatedPercentile("getting-warmer", 3, 500)).toBeGreaterThan(estimatedPercentile("getting-warmer", 14, 500));
    expect(estimatedPercentile("getting-warmer", 14, 500)).toBeGreaterThan(estimatedPercentile("getting-warmer", 30, 500));
  });

  it("stays within 1 to 99 at the edges", () => {
    expect(estimatedPercentile("freezeframes", 0, 4000)).toBeGreaterThanOrEqual(1);
    expect(estimatedPercentile("freezeframes", 4000, 4000)).toBeLessThanOrEqual(99);
    expect(estimatedPercentile("ball-knowledge", 200, 200)).toBe(99);
    expect(estimatedPercentile("getting-warmer", 400, 500)).toBe(1);
    expect(estimatedPercentile("getting-warmer", 1, 500)).toBeLessThanOrEqual(99);
  });

  it("falls back to the middle when the maximum is unknown", () => {
    expect(estimatedPercentile("brain-dead", 900, 0)).toBe(50);
  });
});

describe("percentileFor", () => {
  const base = { game: "freezeframes" as const, score: 2200, max: 4000, ownCounted: true };

  it("estimates below the minimum sample", () => {
    const result = percentileFor({ ...base, total: MIN_SAMPLE - 1, worse: 28 });
    expect(result).toEqual({ percentile: estimatedPercentile("freezeframes", 2200, 4000), source: "estimated", sample: 29 });
  });

  it("measures from the minimum sample up, leaving the player out of the crowd", () => {
    expect(percentileFor({ ...base, total: MIN_SAMPLE, worse: 20 })).toEqual({
      percentile: 69,
      source: "measured",
      sample: 30,
    });
  });

  it("counts everyone as the crowd when the player has no stored row", () => {
    expect(percentileFor({ ...base, ownCounted: false, total: 40, worse: 10 }).percentile).toBe(25);
  });
});

describe("zForPercentile", () => {
  it("is zero at the median and symmetric around it", () => {
    expect(zForPercentile(50)).toBeCloseTo(0, 3);
    expect(zForPercentile(84.13)).toBeCloseTo(1, 2);
    expect(zForPercentile(2.5)).toBeCloseTo(-1.96, 2);
    expect(zForPercentile(30)).toBeCloseTo(-zForPercentile(70), 6);
  });

  it("keeps the marker inside the plot for out-of-range input", () => {
    expect(zForPercentile(0)).toBeGreaterThan(-2.7);
    expect(zForPercentile(100)).toBeLessThan(2.7);
  });
});

describe("axisLabels", () => {
  it("shows the score range when the game has a maximum", () => {
    expect(axisLabels("freezeframes", 4000)).toEqual({ lowLabel: "0", highLabel: "4,000" });
    expect(axisLabels("anyguessr", 700)).toEqual({ lowLabel: "0", highLabel: "700" });
  });

  it("uses words when there is no maximum to show", () => {
    expect(axisLabels("brain-dead", null)).toEqual({ lowLabel: "0", highLabel: "top score" });
    expect(axisLabels("ball-knowledge", 200)).toEqual({ lowLabel: "0", highLabel: "most named" });
  });

  it("reverses the meaning for Getting Warmer", () => {
    expect(axisLabels("getting-warmer", 500)).toEqual({ lowLabel: "most guesses", highLabel: "fewest" });
  });
});
