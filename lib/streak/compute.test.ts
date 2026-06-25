import { describe, expect, it } from "vitest";
import { computeStreak } from "./compute";

describe("computeStreak", () => {
  it("returns 0 for no play dates", () => {
    expect(computeStreak([], "2026-06-25")).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    expect(
      computeStreak(["2026-06-23", "2026-06-24", "2026-06-25"], "2026-06-25"),
    ).toBe(3);
  });

  it("counts consecutive days ending yesterday when today is missing", () => {
    expect(
      computeStreak(["2026-06-23", "2026-06-24"], "2026-06-25"),
    ).toBe(2);
  });

  it("breaks on a gap", () => {
    expect(
      computeStreak(["2026-06-20", "2026-06-24", "2026-06-25"], "2026-06-25"),
    ).toBe(2);
  });

  it("returns 0 when last play was more than one day ago", () => {
    expect(computeStreak(["2026-06-20"], "2026-06-25")).toBe(0);
  });
});
