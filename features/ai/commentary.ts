import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod/v4";
import { buildCommentaryPrompt } from "./prompts/commentary";

export const COMMENTARY_PROMPT_VERSION = "v1";

const MODEL = process.env.OPENAI_MODEL || "gpt-5.5";
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

export const commentaryTagSchema = z.enum([
  "reach",
  "steal",
  "trend",
  "run",
  "surprise",
]);

export const commentaryOutputSchema = z.object({
  text: z.string().min(1).max(240),
  tags: z.array(commentaryTagSchema).max(3),
});

export type CommentaryOutput = z.infer<typeof commentaryOutputSchema>;

export function makeIdempotencyKey(
  draftId: string,
  pickId: string,
): string {
  return `commentary:${draftId}:${pickId}:${COMMENTARY_PROMPT_VERSION}`;
}

export interface GenerateCommentaryInput {
  personality: string;
  playerName: string;
  itemName: string;
  tags: string[];
  overallPick: number;
  totalPicks: number;
  topic: string;
}

export async function generateCommentary(
  input: GenerateCommentaryInput,
): Promise<CommentaryOutput> {
  const client = getClient();
  const prompt = buildCommentaryPrompt(input);

  const response = await client.responses.create(
    {
      model: MODEL,
      input: [
        { role: "system", content: [{ type: "input_text", text: prompt.system }] },
        { role: "user", content: [{ type: "input_text", text: prompt.user }] },
      ],
      text: { format: zodTextFormat(commentaryOutputSchema, "commentary_output") },
      reasoning: { effort: "low" },
      max_output_tokens: 512,
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

  const validation = commentaryOutputSchema.safeParse(parsedResult);
  if (!validation.success) {
    throw new Error(`AI response failed validation: ${validation.error.message}`);
  }

  return validation.data;
}
