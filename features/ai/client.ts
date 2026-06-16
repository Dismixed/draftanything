import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import { generatePoolInputSchema, poolOutputSchema, type GeneratePoolInput } from "./schemas";
import { buildPoolPrompt } from "./prompts/pool";

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
      text: { format: zodTextFormat(poolOutputSchema, "pool_output") },
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

  const validation = poolOutputSchema.safeParse(parsedResult);
  if (!validation.success) {
    throw new Error(`AI response failed validation: ${validation.error.message}`);
  }

  return validation.data;
}
