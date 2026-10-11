import { describe, expect, it } from "vitest";
import { tiltFor } from "@/lib/hot-takes/tilt";

describe("Hot Takes snapshot tilt", () => {
  it("gives the same item the same tilt every time", () => {
    expect(tiltFor(3)).toBe(tiltFor(3));
  });

  it("stays a small rotation and is never flat", () => {
    for (let i = 0; i < 40; i++) {
      const tilt = tiltFor(i);
      expect(Math.abs(tilt)).toBeGreaterThan(0);
      expect(Math.abs(tilt)).toBeLessThanOrEqual(6);
    }
  });

  it("does not tilt neighbours the same way", () => {
    for (let i = 0; i < 30; i++) expect(tiltFor(i)).not.toBe(tiltFor(i + 1));
  });

  it("copes with indexes outside the list", () => {
    expect(tiltFor(15)).toBe(tiltFor(0));
    expect(tiltFor(-1)).toBe(tiltFor(14));
  });
});
