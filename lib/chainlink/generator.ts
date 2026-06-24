import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface GenerateOptions {
  length?: number;
  difficulty?: "easy" | "medium" | "hard";
  category?: string;
  count?: number;
}

export interface CandidateChain {
  words: string[];
  phrases: string[];
  difficulty: "easy" | "medium" | "hard";
  theme: string | null;
  score: number;
}

interface PhraseNode {
  word_a: string;
  word_b: string;
  phrase: string;
  commonness_score: number;
  category: string | null;
}

/* ------------------------------------------------------------------ */
/*  Difficulty scoring constants                                       */
/* ------------------------------------------------------------------ */

const DIFFICULTY_RANGES: Record<string, [number, number]> = {
  easy: [7, 10],
  medium: [5, 8],
  hard: [4, 7],
};

/* ------------------------------------------------------------------ */
/*  Graph builder                                                      */
/* ------------------------------------------------------------------ */

function buildGraph(phrases: PhraseNode[]): Map<string, PhraseNode[]> {
  const graph = new Map<string, PhraseNode[]>();
  for (const p of phrases) {
    const existing = graph.get(p.word_a) ?? [];
    existing.push(p);
    graph.set(p.word_a, existing);
  }
  return graph;
}

function classifyDifficulty(score: number): "easy" | "medium" | "hard" {
  if (score >= 7) return "easy";
  if (score >= 5) return "medium";
  return "hard";
}

/* ------------------------------------------------------------------ */
/*  Chain scoring                                                      */
/* ------------------------------------------------------------------ */

function scoreChain(words: string[], phrases: PhraseNode[]): number {
  let score = phrases.reduce((sum, p) => sum + p.commonness_score, 0);

  // Repeated word penalty
  const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
  if (uniqueWords.size !== words.length) {
    score -= 20;
  }

  // Obscure phrase penalty
  for (const p of phrases) {
    if (p.commonness_score < 4) {
      score -= 10;
    }
  }

  // Proper noun penalty (words starting with capital that aren't common)
  let properNounCount = 0;
  for (const p of phrases) {
    // Heuristic: if word_b starts with a capital letter and isn't a very
    // common word, it's likely a proper noun.
    if (
      /^[A-Z]/.test(p.word_b) &&
      !["America", "English", "French", "Spanish", "German", "Italian", "Chinese", "Japanese"].includes(p.word_b)
    ) {
      properNounCount++;
    }
  }
  if (properNounCount > 1) {
    score -= 5 * properNounCount;
  }

  return Math.max(0, score);
}

/* ------------------------------------------------------------------ */
/*  Chain walk — DFS with depth limit                                  */
/* ------------------------------------------------------------------ */

function walkChain(
  graph: Map<string, PhraseNode[]>,
  startWord: string,
  targetLength: number,
  maxAttempts: number = 200,
): { words: string[]; phraseNodes: PhraseNode[] } | null {
  const visited = new Set<string>();
  const wordPath: string[] = [startWord];
  const phrasePath: PhraseNode[] = [];
  visited.add(startWord.toLowerCase());

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Backtrack if we hit a dead end
    while (phrasePath.length > 0 && phrasePath.length < targetLength - 1) {
      const lastWord = wordPath[wordPath.length - 1];
      const candidates = graph.get(lastWord) ?? [];
      const available = candidates.filter(
        (c) => !visited.has(c.word_b.toLowerCase()),
      );

      if (available.length > 0) {
        break;
      }

      // Backtrack
      phrasePath.pop();
      const removed = wordPath.pop()!;
      visited.delete(removed.toLowerCase());

      if (wordPath.length === 0) return null;
    }

    if (phrasePath.length >= targetLength - 1) break;

    const currentWord = wordPath[wordPath.length - 1];
    const candidates = graph.get(currentWord) ?? [];
    const available = candidates.filter(
      (c) => !visited.has(c.word_b.toLowerCase()),
    );

    if (available.length === 0) {
      // Dead end — backtrack
      if (phrasePath.length === 0) return null;
      phrasePath.pop();
      const removed = wordPath.pop()!;
      visited.delete(removed.toLowerCase());
      continue;
    }

    // Pick the best available candidate (highest score)
    const sorted = [...available].sort(
      (a, b) => b.commonness_score - a.commonness_score,
    );
    // Add some randomness: pick from top 3
    const pick = sorted[Math.floor(Math.random() * Math.min(3, sorted.length))];

    phrasePath.push(pick);
    wordPath.push(pick.word_b);
    visited.add(pick.word_b.toLowerCase());
  }

  if (wordPath.length !== targetLength || phrasePath.length !== targetLength - 1) {
    return null;
  }

  return { words: wordPath, phraseNodes: phrasePath };
}

/* ------------------------------------------------------------------ */
/*  Main generator                                                     */
/* ------------------------------------------------------------------ */

function inferTheme(words: string[], phraseNodes: PhraseNode[]): string | null {
  const categories = phraseNodes
    .map((p) => p.category)
    .filter((c): c is string => c !== null);
  if (categories.length === 0) return null;

  const counts = new Map<string, number>();
  for (const c of categories) {
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }

  let best = "";
  let bestCount = 0;
  for (const [cat, count] of counts) {
    if (count > bestCount) {
      best = cat;
      bestCount = count;
    }
  }

  return best || null;
}

export async function generateChains(
  db: SupabaseClient<Database>,
  options: GenerateOptions = {},
): Promise<CandidateChain[]> {
  const {
    length = 5,
    difficulty,
    category,
    count = 25,
  } = options;

  // 1. Load active phrases
  let query = db
    .from("chain_phrases")
    .select("word_a, word_b, phrase, commonness_score, category")
    .eq("is_active", true);

  if (category) {
    query = query.eq("category", category);
  }

  if (difficulty) {
    const [minScore] = DIFFICULTY_RANGES[difficulty];
    query = query.gte("commonness_score", minScore);
  }

  const { data: phrases, error } = await query;

  if (error) {
    throw new Error(`Failed to load phrases: ${error.message}`);
  }

  if (!phrases || phrases.length < length - 1) {
    throw new Error(
      `Not enough phrases in database (need at least ${length - 1}, have ${phrases?.length ?? 0})`,
    );
  }

  // 2. Build graph
  const graph = buildGraph(phrases);

  if (graph.size === 0) {
    throw new Error("No phrase pairs available to build chains");
  }

  // 3. Collect candidate start words
  // Prefer words that have multiple outgoing edges (branching factor >= 2)
  const startCandidates = [...graph.entries()]
    .filter((entry) => { const [, edges] = entry; return edges.length >= 2 && edges.length <= 20; })
    .sort((a, b) => b[1].length - a[1].length);

  if (startCandidates.length === 0) {
    // Fallback: any word with at least one edge
    startCandidates.push(...graph.entries());
  }

  // 4. Walk graph to generate chains
  const candidates: CandidateChain[] = [];
  const seenKeys = new Set<string>();
  const shuffledStarts = [...startCandidates].sort(() => Math.random() - 0.5);

  for (const [startWord] of shuffledStarts) {
    if (candidates.length >= count) break;

    const result = walkChain(graph, startWord, length);
    if (!result) continue;

    const key = result.words.join("-");
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    // Validate all phrases exist
    const phraseNodes: PhraseNode[] = [];
    let valid = true;
    for (let i = 0; i < result.words.length - 1; i++) {
      const a = result.words[i];
      const b = result.words[i + 1];
      // Find the actual phrase node
      const edges = graph.get(a) ?? [];
      const match = edges.find(
        (e) => e.word_b.toLowerCase() === b.toLowerCase(),
      );
      if (!match) {
        valid = false;
        break;
      }
      phraseNodes.push(match);
    }

    if (!valid || phraseNodes.length !== length - 1) continue;

    const score = scoreChain(result.words, phraseNodes);

    // Enforce difficulty filter
    const chainDifficulty = classifyDifficulty(
      phraseNodes.reduce((sum, p) => sum + p.commonness_score, 0) /
        phraseNodes.length,
    );

    if (difficulty && chainDifficulty !== difficulty) continue;

    const theme = inferTheme(result.words, phraseNodes);

    candidates.push({
      words: result.words,
      phrases: phraseNodes.map((p) => p.phrase),
      difficulty: chainDifficulty,
      theme,
      score,
    });
  }

  // 5. Sort by score descending and return top
  return candidates.sort((a, b) => b.score - a.score).slice(0, count);
}

/* ------------------------------------------------------------------ */
/*  Save generated chains as draft puzzles                             */
/* ------------------------------------------------------------------ */

export async function saveDraftChains(
  db: SupabaseClient<Database>,
  chains: CandidateChain[],
  createdBy?: string,
): Promise<number> {
  const records = chains.map((c) => ({
    title: c.words.join(" → "),
    words: JSON.stringify(c.words),
    phrases: JSON.stringify(c.phrases),
    difficulty: c.difficulty,
    theme: c.theme,
    status: "draft",
    score: c.score,
    created_by: createdBy ?? "generator",
  }));

  const { error } = await db.from("chain_puzzles").insert(records);

  if (error) {
    throw new Error(`Failed to save draft chains: ${error.message}`);
  }

  return records.length;
}

/* ------------------------------------------------------------------ */
/*  Generate phrase pairs from existing chains (extraction helper)     */
/* ------------------------------------------------------------------ */

export function extractPhrasesFromChain(
  words: string[],
): { word_a: string; word_b: string; phrase: string }[] {
  const result: { word_a: string; word_b: string; phrase: string }[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    result.push({
      word_a: words[i],
      word_b: words[i + 1],
      phrase: `${words[i]} ${words[i + 1]}`,
    });
  }
  return result;
}
