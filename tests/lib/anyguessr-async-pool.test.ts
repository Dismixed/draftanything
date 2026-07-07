import { describe, expect, it } from "vitest";
import { mapPool } from "@/lib/anyguessr/async-pool";
import { normalizeAnswer } from "@/lib/anyguessr/normalize";

describe("mapPool", () => {
  it("runs with concurrency limit", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const items = [1, 2, 3, 4, 5];

    await mapPool(items, 2, async (n) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 10));
      inFlight--;
      return n * 2;
    });

    expect(maxInFlight).toBeLessThanOrEqual(2);
  });
});

describe("normalizeAnswer aliases", () => {
  it("normalizes ivory coast variants", () => {
    expect(normalizeAnswer("Côte d'Ivoire")).toBe("cote d ivoire");
    expect(normalizeAnswer("Ivory Coast")).toBe("ivory coast");
  });
});
