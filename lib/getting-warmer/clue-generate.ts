import "server-only";

import { z } from "zod/v4";
import { generateJson } from "@/features/ai/gemini";
import { getLetterRevealClue } from "./game-logic";

const clueSchema = z.object({
  clue: z.string().min(1).max(80),
});

export async function generateAiClue(options: {
  answer: string;
  authoredClues: string[];
  extraClues: string[];
  wrongGuesses: string[];
  clueIndex: number;
}): Promise<string> {
  const { answer, authoredClues, extraClues, wrongGuesses, clueIndex } = options;
  const allShown = [...authoredClues, ...extraClues];
  const letterRevealIndex = clueIndex - authoredClues.length - extraClues.length + 1;

  try {
    const result = await generateJson({
      systemPrompt: `You write short clues for "Getting Warmer", a daily word-guessing game.
Each clue is ONE word or a very short phrase (max 4 words) that nudges the player toward the secret answer without naming it directly.
Clues should get progressively more specific. Never repeat a previous clue. Never include the answer or obvious synonyms.`,
      userPrompt: `Secret answer: "${answer}"
Clues already shown: ${JSON.stringify(allShown)}
Wrong guesses so far: ${JSON.stringify(wrongGuesses)}
Write clue #${clueIndex + 1} — a fresh hint that helps without giving it away.`,
      schema: clueSchema,
      schemaName: "getting_warmer_clue",
      maxOutputTokens: 120,
      timeoutMs: 12_000,
    });

    return result.clue.trim();
  } catch {
    return getLetterRevealClue(answer, letterRevealIndex);
  }
}
