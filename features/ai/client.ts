import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import {
  generatePoolInputSchema,
  normalizePoolAiOutput,
  poolOutputAiSchema,
  poolOutputSchema,
  topicsOutputSchema,
  type GeneratePoolInput,
} from "./schemas";
import { buildPoolPrompt } from "./prompts/pool";
import { buildTopicsPrompt } from "./prompts/topics";
import { generateJson } from "./gemini";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o";
const TIMEOUT_MS = 60_000;

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

export interface PoolGenerationResult {
  items: Array<{ name: string; metadata: Record<string, number> }>;
  rubric: Record<string, number>;
}

export async function generatePool(input: GeneratePoolInput): Promise<PoolGenerationResult> {
  const parsed = generatePoolInputSchema.parse(input);
  const client = getClient();
  const prompt = buildPoolPrompt({
    topic: parsed.topic,
    targetCount: parsed.targetCount,
    existingItems: parsed.existingItems,
  });

  const response = await client.responses.create(
    {
      model: MODEL,
      input: [
        { role: "system", content: [{ type: "input_text", text: prompt.system }] },
        { role: "user", content: [{ type: "input_text", text: prompt.user }] },
      ],
      text: { format: zodTextFormat(poolOutputAiSchema, "pool_output") },
      reasoning: { effort: "low" },
      max_output_tokens: 4096,
    },
    { signal: AbortSignal.timeout(TIMEOUT_MS) },
  );

  const raw = response.output_text;
  if (!raw) {
    throw new Error("AI returned empty response");
  }

  let parsedResult: unknown;
  try {
    parsedResult = JSON.parse(raw);
  } catch {
    throw new Error("AI returned invalid JSON");
  }

  const aiValidation = poolOutputAiSchema.safeParse(parsedResult);
  if (!aiValidation.success) {
    throw new Error(`AI response failed validation: ${aiValidation.error.message}`);
  }

  const validation = poolOutputSchema.safeParse(normalizePoolAiOutput(aiValidation.data));
  if (!validation.success) {
    throw new Error(`AI response failed validation: ${validation.error.message}`);
  }

  return validation.data;
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
