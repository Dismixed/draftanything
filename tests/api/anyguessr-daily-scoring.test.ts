import { describe, expect, it } from "vitest";
import {
  DAILY_MAX_ROUND_SCORE,
  formatDistanceKm,
  scoreFromDistanceKm,
} from "@/lib/anyguessr/daily";
import { haversineKm } from "@/lib/anyguessr/geo";

describe("AnyGuessr daily scoring", () => {
  it("awards full round score at zero distance", () => {
    expect(scoreFromDistanceKm(0)).toBe(DAILY_MAX_ROUND_SCORE);
    expect(scoreFromDistanceKm(10)).toBe(DAILY_MAX_ROUND_SCORE);
  });

  it("decays score with distance", () => {
    const mid = scoreFromDistanceKm(2500);
    const far = scoreFromDistanceKm(8000);
    expect(mid).toBeGreaterThan(far);
    expect(far).toBeGreaterThanOrEqual(0);
  });

  it("formats distances for display", () => {
    expect(formatDistanceKm(0)).toBe("0 km");
    expect(formatDistanceKm(42.4)).toBe("42 km");
    expect(formatDistanceKm(1234)).toBe("1,234 km");
  });
});

describe("AnyGuessr haversineKm", () => {
  it("returns zero for identical coordinates", () => {
    expect(haversineKm([48.8566, 2.3522], [48.8566, 2.3522])).toBe(0);
  });

  it("computes a plausible Paris–London distance", () => {
    const km = haversineKm([48.8566, 2.3522], [51.5074, -0.1278]);
    expect(km).toBeGreaterThan(300);
    expect(km).toBeLessThan(400);
  });
});
