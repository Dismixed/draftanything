import "server-only";

import { GoogleGenAI } from "@google/genai";
import { toJSONSchema } from "zod/v4";
import type { z } from "zod/v4";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const DEFAULT_TIMEOUT_MS = 60_000;

let _client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
}

export interface GenerateJsonOptions<T extends z.ZodType> {
  systemPrompt: string;
  userPrompt: string;
  schema: T;
  schemaName: string;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export async function generateJson<T extends z.ZodType>(
  options: GenerateJsonOptions<T>,
): Promise<z.infer<T>> {
  const {
    systemPrompt,
    userPrompt,
    schema,
    schemaName,
    maxOutputTokens = 4096,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const client = getGeminiClient();

  const jsonSchema = toJSONSchema(schema) as Record<string, unknown>;
  delete jsonSchema["$schema"];

  const response = await client.models.generateContent({
    model: MODEL,
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      responseJsonSchema: jsonSchema,
      maxOutputTokens,
      httpOptions: { timeout: timeoutMs },
    },
  });

  const raw = response.text;
  if (!raw) {
    throw new Error("Gemini returned empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Gemini returned invalid JSON");
  }

  const validation = schema.safeParse(parsed);
  if (!validation.success) {
    throw new Error(
      `Gemini response failed validation (${schemaName}): ${validation.error.message}`,
    );
  }

  return validation.data;
}

export function getGeminiModel(): string {
  return MODEL;
}
