import { describe, expect, it } from "vitest";
import { buildCommentaryPrompt } from "./prompts/commentary";
import { commentaryOutputSchema, COMMENTARY_PROMPT_VERSION } from "./commentary";

describe("buildCommentaryPrompt", () => {
  const baseInput = {
    personality: "analyst" as const,
    playerName: "Alice",
    itemName: "Inception",
    tags: ["reach"] as string[],
    overallPick: 5,
    totalPicks: 10,
    topic: "Sci-Fi Movies",
  };

  it("returns system and user strings", () => {
    const result = buildCommentaryPrompt(baseInput);
    expect(result).toHaveProperty("system");
    expect(result).toHaveProperty("user");
    expect(typeof result.system).toBe("string");
    expect(typeof result.user).toBe("string");
  });

  it("includes personality and item details in the prompt", () => {
    const result = buildCommentaryPrompt(baseInput);
    expect(result.user).toContain("Alice");
    expect(result.user).toContain("Inception");
    expect(result.user).toContain("Sci-Fi Movies");
  });

  it("includes trigger tags in the prompt context", () => {
    const result = buildCommentaryPrompt(baseInput);
    expect(result.user).toContain("reach");
  });

  it("prohibits harmful content in system prompt", () => {
    const result = buildCommentaryPrompt(baseInput);
    expect(result.system.toLowerCase()).toContain("harass");
    expect(result.system.toLowerCase()).toContain("threaten");
    expect(result.system.toLowerCase()).toContain("sexual");
  });

  it("generates different prompts for different personalities", () => {
    const hypePrompt = buildCommentaryPrompt({ ...baseInput, personality: "hype" });
    const roastPrompt = buildCommentaryPrompt({ ...baseInput, personality: "roast" });
    expect(hypePrompt.system).not.toBe(roastPrompt.system);
  });

  it("truncates item name to 60 chars in prompt", () => {
    const longName = "A".repeat(100);
    const result = buildCommentaryPrompt({ ...baseInput, itemName: longName });
    expect(result.user).toContain("A".repeat(60));
    expect(result.user).not.toContain("A".repeat(61));
  });
});

describe("commentaryOutputSchema", () => {
  it("accepts valid commentary output", () => {
    const result = commentaryOutputSchema.safeParse({
      text: "This is a risky pick, Alice!",
      tags: ["reach"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty text", () => {
    const result = commentaryOutputSchema.safeParse({
      text: "",
      tags: ["reach"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects text exceeding 240 characters", () => {
    const result = commentaryOutputSchema.safeParse({
      text: "X".repeat(241),
      tags: ["reach"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid tags", () => {
    const result = commentaryOutputSchema.safeParse({
      text: "A comment",
      tags: ["invalid_tag"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 3 tags", () => {
    const result = commentaryOutputSchema.safeParse({
      text: "A comment",
      tags: ["reach", "steal", "run", "trend"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts 0 tags", () => {
    const result = commentaryOutputSchema.safeParse({
      text: "A comment",
      tags: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid tag values", () => {
    const result = commentaryOutputSchema.safeParse({
      text: "Interesting pick!",
      tags: ["reach", "steal", "run"],
    });
    expect(result.success).toBe(true);
  });
});

describe("generateCommentary", () => {
  it("uses the correct prompt version constant", () => {
    expect(COMMENTARY_PROMPT_VERSION).toBe("v1");
  });
});
