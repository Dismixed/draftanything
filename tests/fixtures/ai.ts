import { vi } from "vitest";
import type { PoolGenerationResult } from "@/features/ai/client";

export const validPoolResult: PoolGenerationResult = {
  items: [
    { name: "Inception", metadata: { quality: 9, rewatchability: 8, originality: 10 } },
    { name: "The Matrix", metadata: { quality: 9, rewatchability: 9, originality: 10 } },
    { name: "Interstellar", metadata: { quality: 8, rewatchability: 7, originality: 9 } },
    { name: "Blade Runner 2049", metadata: { quality: 8, rewatchability: 6, originality: 8 } },
  ],
  rubric: { quality: 40, rewatchability: 30, originality: 30 },
};

export const poolWithDuplicates: PoolGenerationResult = {
  items: [
    { name: "Inception", metadata: { quality: 9, rewatchability: 8 } },
    { name: "inception", metadata: { quality: 7, rewatchability: 6 } },
    { name: "The Matrix", metadata: { quality: 9, rewatchability: 9 } },
    { name: "The Matrix", metadata: { quality: 8, rewatchability: 8 } },
  ],
  rubric: { quality: 50, rewatchability: 50 },
};

export const insufficientItemsResult: PoolGenerationResult = {
  items: [
    { name: "Inception", metadata: { quality: 9, rewatchability: 8 } },
  ],
  rubric: { quality: 50, rewatchability: 50 },
};

export const invalidRubricResult: PoolGenerationResult = {
  items: [
    { name: "Inception", metadata: { quality: 9 } },
  ],
  rubric: { quality: 30, rewatchability: 30 },
};

export function createMockGeneratePool(
  result: PoolGenerationResult | Error,
): ReturnType<typeof vi.fn> {
  return vi.fn().mockImplementation(() => {
    if (result instanceof Error) return Promise.reject(result);
    return Promise.resolve(result);
  });
}
