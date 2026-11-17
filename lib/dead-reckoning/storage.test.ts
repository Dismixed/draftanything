import { describe, expect, it } from "vitest";
import { streaks } from "./storage";

describe("streaks", () => {
  it("counts a streak that ends today or yesterday", () => {
    expect(streaks(["2026-11-14", "2026-11-15", "2026-11-16"], "2026-11-16")).toEqual({ current: 3, longest: 3 });
    expect(streaks(["2026-11-14", "2026-11-15"], "2026-11-16")).toEqual({ current: 2, longest: 2 });
  });

  it("drops to zero after a missed day but keeps the longest", () => {
    expect(streaks(["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-10"], "2026-11-16")).toEqual({ current: 0, longest: 3 });
  });
});
