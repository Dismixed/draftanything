import "server-only";

import {
  generatePoolInputSchema,
  normalizePoolAiOutput,
  poolOutputAiSchema,
  poolOutputSchema,
  topicsOutputSchema,
  type GeneratePoolInput,
  type PoolOutputAi,
} from "./schemas";
import { dedupeItemNames } from "../pool/normalize";
import { buildPoolPrompt } from "./prompts/pool";
import { buildTopicsPrompt } from "./prompts/topics";
import { generateJson } from "./gemini";

const MAX_RETRIES = 2;

export interface PoolGenerationResult {
  items: Array<{ name: string; metadata: Record<string, number> }>;
  rubric: Record<string, number>;
}

function poolOutputTokens(targetCount: number): number {
  return Math.min(16384, 1024 + targetCount * 200);
}

function finalizePoolOutput(
  ai: PoolOutputAi,
  existingItems: string[],
): PoolGenerationResult {
  const normalized = normalizePoolAiOutput(ai);
  const deduped = {
    ...normalized,
    items: dedupeItemNames(normalized.items, { exclude: existingItems }),
  };

  const validation = poolOutputSchema.safeParse(deduped);
  if (!validation.success) {
    throw new Error(`AI response failed validation: ${validation.error.message}`);
  }

  return validation.data;
}

export async function generatePool(input: GeneratePoolInput): Promise<PoolGenerationResult> {
  const parsed = generatePoolInputSchema.parse(input);
  const prompt = buildPoolPrompt({
    topic: parsed.topic,
    targetCount: parsed.targetCount,
    existingItems: parsed.existingItems,
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const aiResult = await generateJson({
        systemPrompt: prompt.system,
        userPrompt: prompt.user,
        schema: poolOutputAiSchema,
        schemaName: "pool_output",
        maxOutputTokens: poolOutputTokens(parsed.targetCount),
      });

      return finalizePoolOutput(aiResult, parsed.existingItems);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < MAX_RETRIES) {
        continue;
      }
    }
  }

  throw lastError ?? new Error("Pool generation failed");
}

export async function suggestTopics(options?: {
  interests?: string;
  exclude?: string[];
}): Promise<string[]> {
  const prompt = buildTopicsPrompt(options);

  const result = await generateJson({
    systemPrompt: prompt.system,
    userPrompt: prompt.user,
    schema: topicsOutputSchema,
    schemaName: "topics_output",
    maxOutputTokens: 1024,
  });

  return result.topics;
}
