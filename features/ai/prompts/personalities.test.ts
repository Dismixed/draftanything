import { describe, expect, it } from "vitest";

import { resolveJudgePersonality } from "./personalities";

describe("resolveJudgePersonality", () => {
  it("returns preset judge descriptions", () => {
    expect(resolveJudgePersonality("analyst")).toContain("data-driven");
    expect(resolveJudgePersonality("hype")).toContain("energetic");
    expect(resolveJudgePersonality("roast")).toContain("playful");
  });

  it("uses the custom prompt when personality is custom", () => {
    expect(
      resolveJudgePersonality("custom", "Judge like a skeptical food critic."),
    ).toBe("Judge like a skeptical food critic.");
  });

  it("throws when custom personality has no prompt", () => {
    expect(() => resolveJudgePersonality("custom", null)).toThrow(
      "custom judge prompt is required",
    );
  });
});
