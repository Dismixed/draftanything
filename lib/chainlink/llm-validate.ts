import "server-only";

import { z } from "zod/v4";
import { generateJson } from "@/features/ai/gemini";

/* ------------------------------------------------------------------ */
/*  Schemas                                                            */
/* ------------------------------------------------------------------ */

const PairValidationSchema = z.object({
  /** The pair being judged, e.g. "apple juice". */
  phrase: z.string(),
  /** True if this reads as a common compound word or set phrase. */
  valid: z.boolean(),
  /** Short human-readable reason, esp. when invalid. */
  reason: z.string(),
});

const ChainValidationSchema = z.object({
  pairs: z.array(PairValidationSchema),
  /** Overall difficulty, 1 (very easy) … 5 (very hard). */
  difficulty: z.number().int().min(1).max(5),
  notes: z.string(),
});

const ChainProposalSchema = z.object({
  chains: z.array(
    z.object({
      words: z.array(z.string()),
    }),
  ),
});

/* ------------------------------------------------------------------ */
/*  Result types                                                       */
/* ------------------------------------------------------------------ */

export interface PairValidation {
  phrase: string;
  valid: boolean;
  reason: string;
}

export interface ChainValidation {
  pairs: PairValidation[];
  /** 1 = very easy … 5 = very hard. */
  difficulty: number;
  notes: string;
  /** True when every consecutive pair is a recognizable phrase. */
  allValid: boolean;
  invalidPairs: PairValidation[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function consecutivePairs(words: readonly string[]): string[] {
  const pairs: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    pairs.push(`${words[i]} ${words[i + 1]}`);
  }
  return pairs;
}

/**
 * Maps the LLM's 1–5 difficulty rating onto the puzzle schema's
 * three-way `difficulty` enum.
 */
export function difficultyFromRating(
  rating: number,
): "easy" | "medium" | "hard" {
  if (rating <= 2) return "easy";
  if (rating === 3) return "medium";
  return "hard";
}

/**
 * Maps the LLM's 1–5 difficulty rating onto a commonness-style score
 * (higher = more common/recognizable), aligned with the phrase-based
 * scores the graph generator produces (~24 for a medium chain).
 */
export function scoreFromRating(rating: number): number {
  const byRating: Record<number, number> = {
    1: 30,
    2: 27,
    3: 24,
    4: 18,
    5: 12,
  };
  return byRating[rating] ?? 24;
}

/* ------------------------------------------------------------------ */
/*  Semantic validation pass                                           */
/* ------------------------------------------------------------------ */

/**
 * The guess-checker only accepts an exact match, so a pair that is a
 * frequent bigram but not a real compound/phrase makes the whole puzzle
 * unsolvable rather than merely awkward. This pass is therefore a
 * hard gate, not a suggestion — callers should treat `allValid: false`
 * as "fix or discard."
 */
export async function validateChainWithLlm(
  words: readonly string[],
): Promise<ChainValidation> {
  const pairs = consecutivePairs(words);

  const result = await generateJson({
    schema: ChainValidationSchema,
    schemaName: "ChainlinkChainValidation",
    systemPrompt: [
      "You validate word-chain puzzles for an American English daily word game.",
      "Each puzzle is a list of words where every consecutive pair must form a common compound word or set phrase that most adults would recognize on sight.",
      "The game accepts exact matches only, with no partial credit — so a pair that is a frequent word sequence but does not read as a real phrase (function-word pairs, proper-noun collocations, obscure constructions) makes the puzzle unsolvable and must be marked invalid.",
      "Flag any pair that is a frequent bigram but does not read as a real phrase.",
      "Rate overall difficulty 1 (very easy) to 5 (very hard).",
    ].join(" "),
    userPrompt: JSON.stringify({ words, pairs }, null, 2),
    maxOutputTokens: 1024,
  });

  const invalidPairs = result.pairs.filter((p) => !p.valid);

  return {
    pairs: result.pairs,
    difficulty: result.difficulty,
    notes: result.notes,
    allValid: invalidPairs.length === 0,
    invalidPairs,
  };
}

/* ------------------------------------------------------------------ */
/*  Second generation source                                           */
/* ------------------------------------------------------------------ */

/**
 * Generate chains directly from the LLM (better phrase intuition than
 * bigram frequency, occasional hallucinated pairs). Run its output
 * back through the Datamuse ambiguity report and a real-word check
 * before trusting it — this returns raw proposals only.
 */
export async function proposeChainsWithLlm(
  seeds: readonly string[],
  options: { length?: number; perSeed?: number } = {},
): Promise<string[][]> {
  const length = options.length ?? 5;
  const perSeed = options.perSeed ?? 2;

  const result = await generateJson({
    schema: ChainProposalSchema,
    schemaName: "ChainlinkChainProposal",
    systemPrompt: [
      "You propose word-chain puzzles for an American English daily word game.",
      "Each chain is a list of words where every consecutive pair forms a common compound word or set phrase that most adults would recognize on sight (e.g. apple, juice, box, spring, break -> apple juice, juice box, box spring, spring break).",
      "Use only single lowercase English words (no multiword entries, no proper nouns).",
      "Each chain must not repeat a word.",
    ].join(" "),
    userPrompt: JSON.stringify(
      { seeds, length, chainsPerSeed: perSeed },
      null,
      2,
    ),
    maxOutputTokens: 2048,
  });

  return result.chains.map((c) => c.words.map((w) => w.trim().toLowerCase()));
}
