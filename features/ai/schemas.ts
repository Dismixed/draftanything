import { z } from "zod/v4";

export const poolItemSchema = z.object({
  name: z.string().min(1).max(60),
  metadata: z.record(z.string(), z.number().min(0).max(10)),
});

/** OpenAI structured output rejects `propertyNames` from z.record(); use explicit arrays instead. */
const rubricEntryAiSchema = z.object({
  category: z.string().min(1),
  weight: z.number().min(0).max(100),
});

const poolItemScoreAiSchema = z.object({
  category: z.string().min(1),
  value: z.number().min(0).max(10),
});

const poolItemAiSchema = z.object({
  name: z.string().min(1).max(60),
  scores: z.array(poolItemScoreAiSchema).min(1),
});

export const poolOutputAiSchema = z.object({
  items: z.array(poolItemAiSchema).min(1, "pool must contain at least one item"),
  rubric: z.array(rubricEntryAiSchema).min(3).max(6),
});

export type PoolOutputAi = z.infer<typeof poolOutputAiSchema>;

export function normalizePoolAiOutput(ai: PoolOutputAi): PoolOutput {
  const rubric = Object.fromEntries(ai.rubric.map((entry) => [entry.category, entry.weight]));
  const items = ai.items.map((item) => ({
    name: item.name,
    metadata: Object.fromEntries(item.scores.map((score) => [score.category, score.value])),
  }));
  return { items, rubric };
}

function normalizeForDedup(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export const poolOutputSchema = z.object({
  items: z.array(poolItemSchema).min(1, "pool must contain at least one item"),
  rubric: z.record(z.string(), z.number().min(0).max(100)),
})
  .refine(
    (data) => {
      const values = Object.values(data.rubric);
      if (values.length === 0) return false;
      return values.reduce((sum, v) => sum + v, 0) === 100;
    },
    { message: "rubric weights must sum to 100" },
  )
  .refine(
    (data) => {
      const seen = new Set<string>();
      for (const item of data.items) {
        const key = normalizeForDedup(item.name);
        if (seen.has(key)) return false;
        seen.add(key);
      }
      return true;
    },
    { message: "item names must be unique" },
  );

export const generatePoolInputSchema = z.object({
  topic: z.string().min(1).max(200),
  targetCount: z.number().int().min(2).max(60),
  existingItems: z.array(z.string()).default([]),
});

export const topicsOutputSchema = z.object({
  topics: z.array(z.string().min(1).max(80)).min(4).max(6),
});

export type PoolItem = z.infer<typeof poolItemSchema>;
export type PoolOutput = z.infer<typeof poolOutputSchema>;
export type GeneratePoolInput = z.infer<typeof generatePoolInputSchema>;
export type TopicsOutput = z.infer<typeof topicsOutputSchema>;
