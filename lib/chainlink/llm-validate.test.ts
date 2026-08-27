import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/ai/gemini", () => ({
  generateJson: vi.fn(),
}));

import { generateJson } from "@/features/ai/gemini";
import {
  difficultyFromRating,
  scoreFromRating,
  validateChainWithLlm,
} from "./llm-validate";

const mockGenerateJson = generateJson as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockGenerateJson.mockReset();
});

describe("difficultyFromRating", () => {
  it.each([
    [1, "easy"],
    [2, "easy"],
    [3, "medium"],
    [4, "hard"],
    [5, "hard"],
  ])("maps rating %i to %s", (rating, expected) => {
    expect(difficultyFromRating(rating)).toBe(expected);
  });
});

describe("scoreFromRating", () => {
  it.each([
    [1, 30],
    [2, 27],
    [3, 24],
    [4, 18],
    [5, 12],
  ])("maps rating %i to score %i", (rating, expected) => {
    expect(scoreFromRating(rating)).toBe(expected);
  });

  it("falls back to a medium score for unknown ratings", () => {
    expect(scoreFromRating(99)).toBe(24);
  });
});

describe("validateChainWithLlm", () => {
  it("reports allValid when every pair is a recognizable phrase", async () => {
    mockGenerateJson.mockResolvedValue({
      pairs: [
        { phrase: "apple juice", valid: true, reason: "common compound" },
        { phrase: "juice box", valid: true, reason: "common compound" },
      ],
      difficulty: 2,
      notes: "easy",
    });

    const result = await validateChainWithLlm(["apple", "juice", "box"]);

    expect(result.allValid).toBe(true);
    expect(result.invalidPairs).toHaveLength(0);
  });

  it("collects invalid pairs into a hard-reject list", async () => {
    mockGenerateJson.mockResolvedValue({
      pairs: [
        { phrase: "apple ii", valid: false, reason: "not a phrase" },
        { phrase: "ii at", valid: true, reason: "ok" },
      ],
      difficulty: 5,
      notes: "function-word chain",
    });

    const result = await validateChainWithLlm(["apple", "ii", "at"]);

    expect(result.allValid).toBe(false);
    expect(result.invalidPairs).toHaveLength(1);
    expect(result.invalidPairs[0].phrase).toBe("apple ii");
  });
});
