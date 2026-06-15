import { describe, expect, it } from "vitest";
import { evaluateCommentaryTrigger } from "./commentary-trigger";
import type { CommentaryTriggerInput } from "./commentary-trigger";

const weights: Record<string, number> = { quality: 40, speed: 30, style: 30 };

const lowItem: Record<string, number> = { quality: 2, speed: 1, style: 1 };

const midItem: Record<string, number> = { quality: 5, speed: 5, style: 5 };

const highItem: Record<string, number> = { quality: 9, speed: 9, style: 9 };

const allItems = [
  { quality: 9, speed: 9, style: 9 },
  { quality: 8, speed: 8, style: 8 },
  { quality: 8, speed: 7, style: 7 },
  { quality: 7, speed: 7, style: 7 },
  { quality: 6, speed: 6, style: 6 },
  { quality: 5, speed: 5, style: 5 },
  { quality: 4, speed: 4, style: 4 },
  { quality: 3, speed: 3, style: 3 },
  { quality: 2, speed: 2, style: 2 },
  { quality: 1, speed: 1, style: 1 },
];

function makeInput(overrides?: Partial<CommentaryTriggerInput>): CommentaryTriggerInput {
  return {
    pickedItemScores: lowItem,
    allItemScores: allItems,
    overallPick: 5,
    totalPicks: 10,
    rubricWeights: weights,
    recentPickScores: [],
    seatPickScores: [],
    picksSinceLastCommentary: 3,
    ...overrides,
  };
}

describe("evaluateCommentaryTrigger", () => {
  it("returns null when no trigger conditions are met", () => {
    const result = evaluateCommentaryTrigger(
      makeInput({ pickedItemScores: midItem }),
    );
    expect(result).toBeNull();
  });

  it("detects a reach when item is in bottom quartile", () => {
    const result = evaluateCommentaryTrigger(
      makeInput({
        pickedItemScores: { quality: 1, speed: 1, style: 1 },
        overallPick: 3,
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.tags).toContain("reach");
    expect(result!.priority).toBe(8);
  });

  it("detects a steal when top-quartile item is picked after halfway", () => {
    const result = evaluateCommentaryTrigger(
      makeInput({
        pickedItemScores: { quality: 9, speed: 9, style: 9 },
        overallPick: 8,
        totalPicks: 10,
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.tags).toContain("steal");
    expect(result!.priority).toBe(10);
  });

  it("does not tag steal when top item is picked early", () => {
    const result = evaluateCommentaryTrigger(
      makeInput({
        pickedItemScores: { quality: 9, speed: 9, style: 9 },
        overallPick: 2,
        totalPicks: 10,
      }),
    );
    expect(result).toBeNull();
  });

  it("detects a category run when 3+ recent picks share a highest category", () => {
    const result = evaluateCommentaryTrigger(
      makeInput({
        pickedItemScores: { quality: 9, speed: 1, style: 1 },
        recentPickScores: [
          { scores: { quality: 8, speed: 2, style: 2 }, seat: 1 },
          { scores: { quality: 7, speed: 3, style: 3 }, seat: 2 },
          { scores: { quality: 6, speed: 4, style: 4 }, seat: 3 },
        ],
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.tags).toContain("run");
    expect(result!.priority).toBe(5);
  });

  it("detects a roster trend when 2+ picks by same seat share a highest category", () => {
    const result = evaluateCommentaryTrigger(
      makeInput({
        pickedItemScores: { quality: 9, speed: 1, style: 1 },
        seatPickScores: [
          { quality: 8, speed: 2, style: 2 },
          { quality: 7, speed: 3, style: 3 },
        ],
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.tags).toContain("trend");
    expect(result!.priority).toBe(5);
  });

  it("enforces minimum interval of 2 picks since last commentary", () => {
    const result = evaluateCommentaryTrigger(
      makeInput({
        picksSinceLastCommentary: 1,
        pickedItemScores: { quality: 1, speed: 1, style: 1 },
      }),
    );
    expect(result).toBeNull();
  });

  it("allows commentary exactly at interval boundary of 2", () => {
    const result = evaluateCommentaryTrigger(
      makeInput({
        picksSinceLastCommentary: 2,
        pickedItemScores: { quality: 1, speed: 1, style: 1 },
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.tags).toContain("reach");
  });

  it("returns highest priority tag when multiple triggers fire", () => {
    const result = evaluateCommentaryTrigger(
      makeInput({
        pickedItemScores: { quality: 1, speed: 5, style: 3 },
        overallPick: 8,
        totalPicks: 10,
        seatPickScores: [
          { quality: 2, speed: 6, style: 4 },
        ],
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.priority).toBe(8);
    expect(result!.tags).toEqual(["reach", "trend"]);
  });

  it("treats equal category scores as no single highest category", () => {
    const result = evaluateCommentaryTrigger(
      makeInput({
        pickedItemScores: { quality: 5, speed: 5, style: 5 },
        recentPickScores: [
          { scores: { quality: 5, speed: 5, style: 5 }, seat: 1 },
          { scores: { quality: 5, speed: 5, style: 5 }, seat: 2 },
        ],
      }),
    );
    expect(result).toBeNull();
  });

  it("ignores picks with empty scores", () => {
    const result = evaluateCommentaryTrigger(
      makeInput({
        pickedItemScores: {},
        allItemScores: [],
      }),
    );
    expect(result).toBeNull();
  });
});
