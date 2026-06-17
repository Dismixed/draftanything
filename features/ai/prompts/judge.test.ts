import { describe, expect, it } from "vitest";

import { buildJudgePrompt } from "./judge";

describe("buildJudgePrompt", () => {
  it("includes player, pick, and item ids for structured output", () => {
    const prompt = buildJudgePrompt({
      topic: "Best pizza toppings",
      personality: "analyst",
      rubric: [{ key: "taste", weight: 100 }],
      rosters: [
        {
          playerId: "51e6cc70-b643-4d51-b1aa-97fb94459fc3",
          displayName: "Alice",
          picks: [
            {
              pickId: "pick-1",
              itemId: "item-1",
              itemName: "Pepperoni",
              metadata: { taste: 8 },
              overallPick: 1,
            },
          ],
        },
      ],
      defenses: [
        {
          playerId: "51e6cc70-b643-4d51-b1aa-97fb94459fc3",
          defenseText: "Classic choice.",
          skipped: false,
        },
      ],
    });

    expect(prompt.user).toContain("51e6cc70-b643-4d51-b1aa-97fb94459fc3");
    expect(prompt.user).toContain("pickId=pick-1");
    expect(prompt.user).toContain("itemId=item-1");
    expect(prompt.system).toContain("Use the exact playerId, pickId, and itemId values");
  });

  it("uses custom judge instructions in the system prompt", () => {
    const prompt = buildJudgePrompt({
      topic: "Best pizza toppings",
      personality: "custom",
      customJudgePrompt: "Judge like a skeptical food critic.",
      rubric: [{ key: "taste", weight: 100 }],
      rosters: [],
      defenses: [],
    });

    expect(prompt.system).toContain("Judge like a skeptical food critic.");
  });
});
