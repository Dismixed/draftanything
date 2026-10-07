import { describe, expect, it } from "vitest";
import {
  DAILY_EXACT_MATCH_KM,
  DAILY_MAX_ROUND_SCORE,
  DAILY_SCORE_DECAY_KM,
  formatDistanceKm,
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
    const mid = scoreFromDistanceKm(DAILY_SCORE_DECAY_KM);
    const far = scoreFromDistanceKm(8000);
    expect(mid).toBeGreaterThan(far);
    expect(far).toBeGreaterThanOrEqual(0);
  });

  it("awards full round score within the exact-match radius", () => {
    expect(scoreFromDistanceKm(DAILY_EXACT_MATCH_KM)).toBe(DAILY_MAX_ROUND_SCORE);
    expect(scoreFromDistanceKm(DAILY_EXACT_MATCH_KM + 1)).toBeLessThan(
      DAILY_MAX_ROUND_SCORE,
    );
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
