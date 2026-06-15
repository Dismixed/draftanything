import { describe, expect, it, vi } from "vitest";

import { generatePoolInputSchema, poolOutputSchema } from "./schemas";
import {
  validPoolResult,
  poolWithDuplicates,
  invalidRubricResult,
} from "../../tests/fixtures/ai";

vi.mock("openai", () => {
  const MockOpenAI = vi.fn(() => ({
    responses: {
      create: vi.fn(),
    },
  }));
  return { default: MockOpenAI };
});

vi.mock("openai/helpers/zod", () => ({
  zodTextFormat: vi.fn(() => ({ type: "json_schema" as const, name: "test", schema: {} })),
}));

describe("generatePoolInputSchema", () => {
  it("accepts valid input", () => {
    const result = generatePoolInputSchema.safeParse({
      topic: "Sci-Fi Movies",
      targetCount: 10,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty topic", () => {
    const result = generatePoolInputSchema.safeParse({
      topic: "",
      targetCount: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects targetCount below minimum", () => {
    const result = generatePoolInputSchema.safeParse({
      topic: "Movies",
      targetCount: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("poolOutputSchema", () => {
  it("accepts a valid pool output", () => {
    const result = poolOutputSchema.safeParse(validPoolResult);
    expect(result.success).toBe(true);
  });

  it("rejects duplicate names via refine (double)", () => {
    const result = poolOutputSchema.safeParse(poolWithDuplicates);
    expect(result.success).toBe(false);
  });

  it("rejects rubric weights that do not sum to 100", () => {
    const result = poolOutputSchema.safeParse(invalidRubricResult);
    expect(result.success).toBe(false);
  });

  it("rejects item name exceeding 60 characters", () => {
    const result = poolOutputSchema.safeParse({
      items: [{ name: "A".repeat(61), metadata: { x: 5 } }],
      rubric: { x: 100 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects metadata value outside 0-10 range", () => {
    const result = poolOutputSchema.safeParse({
      items: [{ name: "Test", metadata: { x: 11 } }],
      rubric: { x: 100 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects metadata value below 0", () => {
    const result = poolOutputSchema.safeParse({
      items: [{ name: "Test", metadata: { x: -1 } }],
      rubric: { x: 100 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty items array", () => {
    const result = poolOutputSchema.safeParse({
      items: [],
      rubric: { x: 100 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty rubric", () => {
    const result = poolOutputSchema.safeParse({
      items: [{ name: "Test", metadata: { x: 5 } }],
      rubric: {},
    });
    expect(result.success).toBe(false);
  });
});

describe("duplicate detection in schema", () => {
  it("detects exact duplicate names", () => {
    const result = poolOutputSchema.safeParse({
      items: [
        { name: "Alpha", metadata: { x: 5 } },
        { name: "Alpha", metadata: { x: 6 } },
      ],
      rubric: { x: 100 },
    });
    expect(result.success).toBe(false);
  });

  it("detects case-insensitive duplicates", () => {
    const result = poolOutputSchema.safeParse(poolWithDuplicates);
    expect(result.success).toBe(false);
  });
});
