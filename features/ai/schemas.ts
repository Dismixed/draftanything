import { z } from "zod/v4";

export const poolItemSchema = z.object({
  name: z.string().min(1).max(60),
  metadata: z.record(z.string(), z.number().min(0).max(10)),
});

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

export type PoolItem = z.infer<typeof poolItemSchema>;
export type PoolOutput = z.infer<typeof poolOutputSchema>;
export type GeneratePoolInput = z.infer<typeof generatePoolInputSchema>;
