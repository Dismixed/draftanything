import { describe, expect, it, vi } from "vitest";
import { zodTextFormat } from "openai/helpers/zod";

import {
  generatePoolInputSchema,
  normalizePoolAiOutput,
  poolOutputAiSchema,
  poolOutputSchema,
} from "./schemas";
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

vi.mock("./pool", () => ({
  generatePool: vi.fn(),
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

describe("poolOutputAiSchema", () => {
  it("does not emit propertyNames in OpenAI JSON schema", () => {
    const format = zodTextFormat(poolOutputAiSchema, "pool_output");
    const schemaJson = JSON.stringify(format.schema);
    expect(schemaJson).not.toContain("propertyNames");
  });

  it("normalizes to canonical pool output", () => {
    const ai = {
      items: [
        {
          name: "Inception",
          scores: [
            { category: "quality", value: 9 },
            { category: "rewatchability", value: 8 },
          ],
        },
      ],
      rubric: [
        { category: "quality", weight: 60 },
        { category: "rewatchability", weight: 40 },
      ],
    };

    const result = poolOutputSchema.safeParse(normalizePoolAiOutput(ai));
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      items: [{ name: "Inception", metadata: { quality: 9, rewatchability: 8 } }],
      rubric: { quality: 60, rewatchability: 40 },
    });
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

describe("generatePool contract tests", () => {
  it("propagates timeout errors to callers", async () => {
    const { generatePool } = await import("./pool");
    vi.mocked(generatePool).mockRejectedValue(
      new DOMException("The operation was aborted", "AbortError"),
    );
    await expect(
      generatePool({ topic: "test", targetCount: 5, existingItems: [] }),
    ).rejects.toThrow(/aborted/i);
  });

  it("propagates schema validation errors when AI returns invalid data", async () => {
    const { generatePool } = await import("./pool");
    vi.mocked(generatePool).mockRejectedValue(
      new Error("AI response failed validation"),
    );
    await expect(
      generatePool({ topic: "test", targetCount: 5, existingItems: [] }),
    ).rejects.toThrow(/validation/i);
  });
});
