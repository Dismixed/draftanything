import { describe, expect, it } from "vitest";
import { POOL_COUNTRIES } from "@/lib/anyguessr/countries";
import { getLatLngForCca3 } from "@/lib/anyguessr/country-geo";
import { SEED } from "@/lib/anyguessr/seed";

describe("POOL_COUNTRIES", () => {
  it("keeps every country from the original seed list", () => {
    const codes = new Set(POOL_COUNTRIES.map((c) => c.cca3));
    for (const seed of SEED) expect(codes.has(seed.cca3)).toBe(true);
  });

  it("adds countries beyond the original seed list", () => {
    const chile = POOL_COUNTRIES.find((c) => c.cca3 === "CHL");
    expect(chile).toEqual({ cca3: "CHL", common: "Chile", region: "Americas", capital: "Santiago" });
    expect(POOL_COUNTRIES.length).toBeGreaterThan(SEED.length);
  });

  it("lists each country once", () => {
    const codes = POOL_COUNTRIES.map((c) => c.cca3);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("only lists countries the game can place on the map for scoring", () => {
    for (const country of POOL_COUNTRIES) {
      expect(getLatLngForCca3(country.cca3), country.common).not.toBeNull();
    }
  });
});
