import { beforeEach, describe, expect, it, vi } from "vitest";
import { zodTextFormat } from "openai/helpers/zod";

import {
  generatePoolInputSchema,
  normalizePoolAiOutput,
  poolOutputAiSchema,
  poolOutputSchema,
} from "./schemas";
import { dedupeItemNames } from "../pool/normalize";
import {
  validPoolResult,
  poolWithDuplicates,
  invalidRubricResult,
} from "../../tests/fixtures/ai";

vi.mock("openai/helpers/zod", () => ({
  zodTextFormat: vi.fn(() => ({ type: "json_schema" as const, name: "test", schema: {} })),
}));

vi.mock("./gemini", () => ({
  generateJson: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

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

  it("accepts duplicate AI output after deduplication", () => {
    const ai = {
      items: [
        {
          name: "Inception",
          scores: [
            { category: "quality", value: 9 },
            { category: "rewatchability", value: 8 },
          ],
        },
        {
          name: "inception",
          scores: [
            { category: "quality", value: 7 },
            { category: "rewatchability", value: 6 },
          ],
        },
        {
          name: "The Matrix",
          scores: [
            { category: "quality", value: 9 },
            { category: "rewatchability", value: 9 },
          ],
        },
      ],
      rubric: [
        { category: "quality", weight: 50 },
        { category: "rewatchability", weight: 50 },
      ],
    };

    const normalized = normalizePoolAiOutput(ai);
    const deduped = {
      ...normalized,
      items: dedupeItemNames(normalized.items),
    };
    const result = poolOutputSchema.safeParse(deduped);
    expect(result.success).toBe(true);
    expect(result.data?.items).toHaveLength(2);
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

describe("generatePool", () => {
  it("uses Gemini structured JSON and dedupes the result", async () => {
    const { generateJson } = await import("./gemini");
    const { generatePool } = await import("./client");

    vi.mocked(generateJson).mockResolvedValue({
      items: [
        {
          name: "Inception",
          scores: [
            { category: "quality", value: 9 },
            { category: "rewatchability", value: 8 },
          ],
        },
        {
          name: "inception",
          scores: [
            { category: "quality", value: 7 },
            { category: "rewatchability", value: 6 },
          ],
        },
      ],
      rubric: [
        { category: "quality", weight: 50 },
        { category: "rewatchability", weight: 50 },
      ],
    });

    const result = await generatePool({
      topic: "Sci-Fi Movies",
      targetCount: 10,
      existingItems: [],
    });

    expect(generateJson).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaName: "pool_output",
        maxOutputTokens: 1024 + 10 * 200,
      }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe("Inception");
  });

  it("retries when Gemini returns invalid JSON", async () => {
    const { generateJson } = await import("./gemini");
    const { generatePool } = await import("./client");

    vi.mocked(generateJson)
      .mockRejectedValueOnce(new Error("Gemini returned invalid JSON"))
      .mockResolvedValueOnce({
        items: [
          {
            name: "Alien",
            scores: [
              { category: "quality", value: 9 },
              { category: "impact", value: 8 },
              { category: "originality", value: 9 },
            ],
          },
        ],
        rubric: [
          { category: "quality", weight: 40 },
          { category: "impact", weight: 30 },
          { category: "originality", weight: 30 },
        ],
      });

    const result = await generatePool({
      topic: "Sci-Fi Movies",
      targetCount: 5,
      existingItems: [],
    });

    expect(generateJson).toHaveBeenCalledTimes(2);
    expect(result.items[0]?.name).toBe("Alien");
  });

  it("propagates errors after retries are exhausted", async () => {
    const { generateJson } = await import("./gemini");
    const { generatePool } = await import("./client");

    vi.mocked(generateJson).mockRejectedValue(new Error("Gemini returned invalid JSON"));

    await expect(
      generatePool({ topic: "test", targetCount: 5, existingItems: [] }),
    ).rejects.toThrow(/invalid JSON/i);
    expect(generateJson).toHaveBeenCalledTimes(3);
  });

  it("propagates schema validation errors when AI returns invalid data", async () => {
    const { generateJson } = await import("./gemini");
    const { generatePool } = await import("./client");

    vi.mocked(generateJson).mockResolvedValue({
      items: [{ name: "Test", scores: [{ category: "quality", value: 9 }] }],
      rubric: [{ category: "quality", weight: 50 }],
    });

    await expect(
      generatePool({ topic: "test", targetCount: 5, existingItems: [] }),
    ).rejects.toThrow(/validation/i);
  });
});
