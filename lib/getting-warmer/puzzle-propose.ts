import "server-only";

import { z } from "zod/v4";
import { generateJson } from "@/features/ai/gemini";

const puzzleSchema = z.object({
  answer: z.string().min(2).max(30),
  clues: z.array(z.string().min(1).max(80)).min(4).max(10),
});

const puzzlesBatchSchema = z.object({
  puzzles: z.array(puzzleSchema).min(5).max(5),
});

export interface ProposedPuzzle {
  answer: string;
  clues: string[];
}

const SYSTEM_PROMPT = [
  'You design puzzles for "Getting Warmer", a daily word-guessing game.',
  "Pick fun, recognizable single words as answers (nouns, animals, foods, places, everyday objects — no obscure words, no proper nouns that are too niche).",
  "For each puzzle write exactly 6 clues that guide the player from vague to obvious without ever naming the answer directly.",
  "Clue rules: each clue is ONE word or a very short phrase (max 4 words); clues must get progressively more specific; never include the answer word or obvious synonyms; no clue should repeat another.",
  "All 5 puzzles must have different answers.",
].join(" ");

export async function proposePuzzlesBatchWithLlm(): Promise<ProposedPuzzle[]> {
  const result = await generateJson({
    schema: puzzlesBatchSchema,
    schemaName: "GettingWarmerPuzzleBatch",
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: JSON.stringify({ game: "Getting Warmer", count: 5 }),
    maxOutputTokens: 2048,
  });

  return result.puzzles.map((p) => ({
    answer: p.answer.trim().toUpperCase(),
    clues: p.clues.map((c) => c.trim()),
  }));
}
