import { describe, expect, it } from "vitest";
import { addDays, isLocked, reviewWindow, todayUtc } from "./dates";

describe("daily review dates", () => {
  it("uses the UTC date", () => {
    expect(todayUtc(new Date("2026-10-15T23:30:00-07:00"))).toBe("2026-10-16");
  });

  it("adds days across a month boundary", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
  });

  it("covers today and the next nine days", () => {
    const window = reviewWindow("2026-10-15");
    expect(window).toHaveLength(10);
    expect(window[0]).toBe("2026-10-15");
    expect(window[9]).toBe("2026-10-24");
  });

  it("locks today and the past, not tomorrow", () => {
    expect(isLocked("2026-10-14", "2026-10-15")).toBe(true);
    expect(isLocked("2026-10-15", "2026-10-15")).toBe(true);
    expect(isLocked("2026-10-16", "2026-10-15")).toBe(false);
  });
});
