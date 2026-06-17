import { describe, expect, it } from "vitest";
import { zodTextFormat } from "openai/helpers/zod";
import { judgeOutputAiSchema, normalizeJudgeAiOutput, validateJudgeOutput } from "./judge";

describe("judgeOutputAiSchema", () => {
  it("does not emit propertyNames in OpenAI JSON schema", () => {
    const format = zodTextFormat(judgeOutputAiSchema, "judge_output");
    const schemaJson = JSON.stringify(format.schema);
    expect(schemaJson).not.toContain("propertyNames");
  });

  it("normalizes to canonical judge output", () => {
    const ai = {
      playerScores: [
        {
          playerId: "p1",
          overall: 8,
          categories: [
            { key: "creativity", value: 8 },
            { key: "execution", value: 8 },
          ],
        },
      ],
      ranking: ["p1"],
      winnerPlayerIds: ["p1"],
      awards: {
        bestPick: { pickId: "pick1", itemId: "item1", playerId: "p1" },
        worstPick: { pickId: "pick2", itemId: "item2", playerId: "p1" },
        biggestSteal: { pickId: "pick3", itemId: "item3", playerId: "p1" },
      },
      explanation: "Strong roster.",
    };

    expect(normalizeJudgeAiOutput(ai)).toEqual({
      playerScores: {
        p1: { overall: 8, categories: { creativity: 8, execution: 8 } },
      },
      ranking: ["p1"],
      winnerPlayerIds: ["p1"],
      awards: ai.awards,
      explanation: "Strong roster.",
    });
  });
});

describe("validateJudgeOutput", () => {
  const playerIds = ["p1", "p2", "p3"];
  const rubric = [
    { key: "creativity", weight: 50 },
    { key: "execution", weight: 50 },
  ];

  const validOutput = {
    playerScores: {
      p1: { overall: 8, categories: { creativity: 8, execution: 8 } },
      p2: { overall: 6, categories: { creativity: 6, execution: 6 } },
      p3: { overall: 7, categories: { creativity: 7, execution: 7 } },
    },
    ranking: ["p1", "p3", "p2"],
    winnerPlayerIds: ["p1"],
    awards: {
      bestPick: { pickId: "pick1", itemId: "item1", playerId: "p1" },
      worstPick: { pickId: "pick2", itemId: "item2", playerId: "p2" },
      biggestSteal: { pickId: "pick3", itemId: "item3", playerId: "p3" },
    },
    explanation: "p1 wins with a strong creative roster.",
  };

  it("accepts a valid judgment output", () => {
    expect(() =>
      validateJudgeOutput(validOutput, playerIds, rubric),
    ).not.toThrow();
  });

  it("rejects output missing a player score", () => {
    const invalid = {
      ...validOutput,
      playerScores: {
        p1: { overall: 8, categories: { creativity: 8, execution: 8 } },
        p2: { overall: 6, categories: { creativity: 6, execution: 6 } },
      },
      ranking: ["p1", "p2"],
    };
    expect(() => validateJudgeOutput(invalid, playerIds, rubric)).toThrow(
      /missing score/i,
    );
  });

  it("rejects output with unexpected player IDs", () => {
    const invalid = {
      ...validOutput,
      playerScores: {
        ...validOutput.playerScores,
        p4: { overall: 5, categories: { creativity: 5, execution: 5 } },
      },
      ranking: ["p1", "p3", "p2", "p4"],
      winnerPlayerIds: ["p1"],
    };
    expect(() => validateJudgeOutput(invalid, playerIds, rubric)).toThrow(
      /unexpected player/i,
    );
  });

  it("rejects output with wrong category keys", () => {
    const invalid = {
      ...validOutput,
      playerScores: {
        p1: { overall: 8, categories: { creativity: 8, style: 8 } },
        p2: { overall: 6, categories: { creativity: 6, execution: 6 } },
        p3: { overall: 7, categories: { creativity: 7, execution: 7 } },
      },
    };
    expect(() => validateJudgeOutput(invalid, playerIds, rubric)).toThrow(
      /rubric keys/i,
    );
  });

  it("rejects output with out-of-range overall score", () => {
    const invalid = {
      ...validOutput,
      playerScores: {
        p1: { overall: 11, categories: { creativity: 8, execution: 8 } },
        p2: { overall: 6, categories: { creativity: 6, execution: 6 } },
        p3: { overall: 7, categories: { creativity: 7, execution: 7 } },
      },
    };
    expect(() => validateJudgeOutput(invalid, playerIds, rubric)).toThrow();
  });

  it("rejects output with winners not in the active set", () => {
    const invalid = {
      ...validOutput,
      winnerPlayerIds: ["p4"],
    };
    expect(() => validateJudgeOutput(invalid, playerIds, rubric)).toThrow(
      /winner.*not.*active/i,
    );
  });

  it("rejects ranking that does not match winner positions", () => {
    const invalid = {
      ...validOutput,
      ranking: ["p3", "p1", "p2"],
    };
    expect(() => validateJudgeOutput(invalid, playerIds, rubric)).toThrow(
      /winners must match/i,
    );
  });

  it("rejects ranking with missing players", () => {
    const invalid = {
      ...validOutput,
      ranking: ["p1", "p2"],
    };
    expect(() => validateJudgeOutput(invalid, playerIds, rubric)).toThrow(
      /ranking must contain/i,
    );
  });

  it("rejects ranking with extra non-players", () => {
    const invalid = {
      ...validOutput,
      ranking: ["p1", "p3", "p2", "p4"],
    };
    expect(() => validateJudgeOutput(invalid, playerIds, rubric)).toThrow(
      /ranking must contain/i,
    );
  });

  it("accepts empty categories when rubric is empty", () => {
    const output = {
      playerScores: {
        p1: { overall: 8, categories: {} },
        p2: { overall: 6, categories: {} },
        p3: { overall: 7, categories: {} },
      },
      ranking: ["p1", "p3", "p2"],
      winnerPlayerIds: ["p1"],
      awards: validOutput.awards,
      explanation: "Off-the-dome judgment.",
    };

    expect(() => validateJudgeOutput(output, playerIds, [])).not.toThrow();
  });
});
