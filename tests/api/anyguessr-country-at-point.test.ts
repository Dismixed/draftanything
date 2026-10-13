import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { lookupCca3AtPoint } from "@/lib/anyguessr/country-at-point";

const worldGeo = JSON.parse(
  readFileSync(
    join(process.cwd(), "public/anyguessr/world-countries-50m.geojson"),
    "utf8",
  ),
) as GeoJSON.FeatureCollection;

describe("lookupCca3AtPoint", () => {
  it("resolves clicks on major countries", () => {
    expect(lookupCca3AtPoint(48.8, 2.3, worldGeo)).toBe("FRA");
    expect(lookupCca3AtPoint(35.7, 139.7, worldGeo)).toBe("JPN");
    expect(lookupCca3AtPoint(39.8, -98.6, worldGeo)).toBe("USA");
  });

  it("resolves small countries and Russia's tip past the date line", () => {
    expect(lookupCca3AtPoint(1.35, 103.82, worldGeo)).toBe("SGP");
    expect(lookupCca3AtPoint(35.9, 14.45, worldGeo)).toBe("MLT");
    expect(lookupCca3AtPoint(66.5, 185, worldGeo)).toBe("RUS");
  });

  it("returns null for ocean clicks", () => {
    expect(lookupCca3AtPoint(0, 0, worldGeo)).toBeNull();
  });
});
