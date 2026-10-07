import { describe, expect, it } from "vitest";
import { dailyChainTag } from "./daily-cache";

describe("dailyChainTag", () => {
  it("names one cache tag per date", () => {
    expect(dailyChainTag("2026-10-08")).toBe("chainlink-daily-2026-10-08");
    expect(dailyChainTag("2026-10-08")).not.toBe(dailyChainTag("2026-10-09"));
  });
});
