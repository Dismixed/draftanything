import { describe, expect, it } from "vitest";
import {
  DAILY_MAX_ROUND_SCORE,
  DAILY_ROUND_COUNT,
  formatDistanceKm,
  maxDailyLookbackDays,
  pickDailyPuzzles,
  scoreFromDistanceKm,
} from "@/lib/anyguessr/daily";
import { haversineKm, resolveGuessToCca3, distanceBetweenCountriesKm } from "@/lib/anyguessr/country-geo";
import { boundsForPoints, equirectangularViewBox, projectLatLng } from "@/lib/anyguessr/map-projection";

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

describe("country geo lookup", () => {
  it("resolves picker country names to cca3", () => {
    expect(resolveGuessToCca3("France")).toBe("FRA");
    expect(resolveGuessToCca3("United States")).toBe("USA");
    expect(resolveGuessToCca3("South Korea")).toBe("KOR");
  });

  it("scores nearby countries with non-zero points", () => {
    const km = distanceBetweenCountriesKm("FRA", "DEU");
    expect(km).toBeGreaterThan(0);
    expect(km).toBeLessThan(1000);
    expect(scoreFromDistanceKm(km)).toBeGreaterThan(0);
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

describe("map projection", () => {
  it("builds a viewBox that contains both points", () => {
    const bounds = boundsForPoints(
      { lat: 48.85, lng: 2.35 },
      { lat: 51.5, lng: -0.12 },
    );
    const [x, y, w, h] = equirectangularViewBox(bounds, 720, 360).split(" ").map(Number);
    const paris = projectLatLng(48.85, 2.35, 720, 360);
    const london = projectLatLng(51.5, -0.12, 720, 360);
    expect(paris.x).toBeGreaterThanOrEqual(x);
    expect(paris.x).toBeLessThanOrEqual(x + w);
    expect(london.y).toBeGreaterThanOrEqual(y);
    expect(london.y).toBeLessThanOrEqual(y + h);
  });
});

describe("pickDailyPuzzles", () => {
  const pool = Array.from({ length: 18 }, (_, i) => ({
    id: `puzzle-${i}`,
    clues: [
      { type: "flag", content: `flag-${i}` },
      { type: "currency", content: `currency-${i}` },
      { type: "jersey", content: `jersey-${i}` },
      { type: "brand", content: `brand-${i}` },
      { type: "landmark", content: `landmark-${i}` },
      { type: "written_language", content: `greeting-${i}` },
      { type: "person", content: `person-${i}` },
      { type: "food", content: `food-${i}` },
      { type: "environment", content: `environment-${i}` },
    ],
  }));

  it("picks nine unique puzzles deterministically per date", () => {
    const a = pickDailyPuzzles(pool, "2026-06-25");
    const b = pickDailyPuzzles(pool, "2026-06-25");
    expect(a).toHaveLength(DAILY_ROUND_COUNT);
    expect(b.map((p) => p.id)).toEqual(a.map((p) => p.id));
    expect(new Set(a.map((p) => p.id)).size).toBe(DAILY_ROUND_COUNT);
  });

  it("picks a different set for a different date", () => {
    const a = pickDailyPuzzles(pool, "2026-06-25").map((p) => p.id);
    const b = pickDailyPuzzles(pool, "2026-06-26").map((p) => p.id);
    expect(a).not.toEqual(b);
  });

  it("avoids countries used on the prior day when the pool allows", () => {
    const prior = pickDailyPuzzles(pool, "2026-06-24", {}).map((p) => p.id);
    const today = pickDailyPuzzles(pool, "2026-06-25").map((p) => p.id);
    expect(today.some((id) => prior.includes(id))).toBe(false);
  });

  it("avoids repeating the same language clue text on consecutive days", () => {
    const priorLanguage = pickDailyPuzzles(pool, "2026-06-24", {})[5].clues.find(
      (clue) => clue.type === "written_language",
    )?.content;
    const todayLanguage = pickDailyPuzzles(pool, "2026-06-25")[5].clues.find(
      (clue) => clue.type === "written_language",
    )?.content;
    expect(todayLanguage).not.toBe(priorLanguage);
  });

  it("computes lookback from pool size", () => {
    expect(maxDailyLookbackDays(18)).toBe(1);
    expect(maxDailyLookbackDays(35)).toBe(2);
  });
});
