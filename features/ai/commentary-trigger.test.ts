import { describe, expect, it } from "vitest";
import {
  evaluateCommentaryTrigger,
  MIN_PICKS_BETWEEN_COMMENTARY,
  ROUNDUP_PICK_INTERVAL,
} from "./commentary-trigger";
import type { CommentaryTriggerInput } from "./commentary-trigger";

const weights: Record<string, number> = { quality: 40, speed: 30, style: 30 };

const lowItem: Record<string, number> = { quality: 2, speed: 1, style: 1 };

const midItem: Record<string, number> = { quality: 5, speed: 5, style: 5 };

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
  it("falls back to roundup on quiet picks after the last commentary", () => {
    const result = evaluateCommentaryTrigger(
      makeInput({
        pickedItemScores: { quality: 4, speed: 4, style: 4 },
        picksSinceLastCommentary: 1,
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.tags).toEqual(["roundup"]);
  });

  it("tags solid picks above the median", () => {
    const result = evaluateCommentaryTrigger(
      makeInput({
        pickedItemScores: { quality: 7, speed: 7, style: 7 },
        picksSinceLastCommentary: 1,
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.tags).toContain("solid");
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

  it("detects surprise when top-quartile item is picked early", () => {
    const result = evaluateCommentaryTrigger(
      makeInput({
        pickedItemScores: { quality: 9, speed: 9, style: 9 },
        overallPick: 2,
        totalPicks: 10,
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.tags).toContain("surprise");
    expect(result!.priority).toBe(9);
  });

  it("does not tag steal or surprise when top item is picked mid-draft", () => {
    const result = evaluateCommentaryTrigger(
      makeInput({
        pickedItemScores: { quality: 9, speed: 9, style: 9 },
        overallPick: 5,
        totalPicks: 10,
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.tags).not.toContain("steal");
    expect(result!.tags).not.toContain("surprise");
  });

  it("detects a category run when 2+ recent picks share a highest category", () => {
    const result = evaluateCommentaryTrigger(
      makeInput({
        pickedItemScores: { quality: 9, speed: 1, style: 1 },
        recentPickScores: [
          { scores: { quality: 8, speed: 2, style: 2 }, seat: 1 },
          { scores: { quality: 7, speed: 3, style: 3 }, seat: 2 },
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

  it(`enforces minimum interval of ${MIN_PICKS_BETWEEN_COMMENTARY} pick(s) since last commentary`, () => {
    const result = evaluateCommentaryTrigger(
      makeInput({
        picksSinceLastCommentary: MIN_PICKS_BETWEEN_COMMENTARY - 1,
        pickedItemScores: { quality: 1, speed: 1, style: 1 },
      }),
    );
    expect(result).toBeNull();
  });

  it("allows commentary at the minimum interval boundary", () => {
    const result = evaluateCommentaryTrigger(
      makeInput({
        picksSinceLastCommentary: MIN_PICKS_BETWEEN_COMMENTARY,
        pickedItemScores: { quality: 1, speed: 1, style: 1 },
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.tags).toContain("reach");
  });

  it(`falls back to roundup after ${ROUNDUP_PICK_INTERVAL} quiet picks`, () => {
    const result = evaluateCommentaryTrigger(
      makeInput({
        pickedItemScores: { quality: 4, speed: 4, style: 4 },
        picksSinceLastCommentary: ROUNDUP_PICK_INTERVAL,
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.tags).toEqual(["roundup"]);
  });

  it("tags the first overall pick as opening", () => {
    const result = evaluateCommentaryTrigger(
      makeInput({
        overallPick: 1,
        pickedItemScores: { quality: 4, speed: 4, style: 4 },
        picksSinceLastCommentary: 999,
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.tags).toContain("opening");
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
        pickedItemScores: { quality: 7, speed: 7, style: 7 },
        recentPickScores: [
          { scores: { quality: 7, speed: 7, style: 7 }, seat: 1 },
          { scores: { quality: 7, speed: 7, style: 7 }, seat: 2 },
        ],
        picksSinceLastCommentary: 1,
      }),
    );
    expect(result).not.toBeNull();
    expect(result!.tags).toContain("solid");
    expect(result!.tags).not.toContain("run");
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
