import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ExistingChainIndex {
  /** Normalized "a|b|c|d|e" keys for every existing puzzle. */
  chains: Set<string>;
}

export interface NoveltyReport {
  /** True when an existing puzzle uses this exact word sequence. */
  duplicateChain: boolean;
  /** Human-readable hard-reject reasons. Empty means "safe to insert." */
  problems: string[];
}

/* ------------------------------------------------------------------ */
/*  Normalization                                                      */
/* ------------------------------------------------------------------ */

function normalizeWord(word: string): string {
  return word.trim().toLowerCase();
}

function normalizeChain(words: readonly string[]): string {
  return words.map(normalizeWord).join("|");
}

/* ------------------------------------------------------------------ */
/*  Index loader                                                       */
/* ------------------------------------------------------------------ */

/**
 * Loads every existing puzzle's words into an in-memory index so a
 * batch of candidates can be novelty-checked with a single query.
 */
export async function loadExistingChainIndex(
  db: SupabaseClient<Database>,
): Promise<ExistingChainIndex> {
  const { data, error } = await db.from("chain_puzzles").select("words");
  if (error) {
    throw new Error(
      `Failed to load existing puzzles for novelty check: ${error.message}`,
    );
  }

  const chains = new Set<string>();
  for (const row of data ?? []) {
    const words = Array.isArray(row.words) ? (row.words as string[]) : [];
    if (words.length === 0) continue;
    chains.add(normalizeChain(words));
  }

  return { chains };
}

/* ------------------------------------------------------------------ */
/*  Check (pure — unit-testable against a pre-built index)             */
/* ------------------------------------------------------------------ */

/**
 * Rejects a candidate only when the exact word sequence (case-insensitive)
 * already exists. Reusing individual words is fine — the only hard rule is
 * "don't save the same chain twice."
 */
export function checkNoveltyAgainstIndex(
  index: ExistingChainIndex,
  chain: readonly string[],
): NoveltyReport {
  const problems: string[] = [];

  const duplicateChain = index.chains.has(normalizeChain(chain));
  if (duplicateChain) {
    problems.push(
      `Chain already exists: ${chain.map(normalizeWord).join(" → ")}.`,
    );
  }

  return { duplicateChain, problems };
}

/**
 * Convenience wrapper that loads the index and checks a single chain.
 */
export async function checkChainNovelty(
  db: SupabaseClient<Database>,
  chain: readonly string[],
): Promise<NoveltyReport> {
  const index = await loadExistingChainIndex(db);
  return checkNoveltyAgainstIndex(index, chain);
}
