import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  MAX_PARTICLES,
  classifyDifficulty,
  countParticles,
  findAmbiguousLinks,
  linkKey,
  type ChainRules,
  type Difficulty,
} from "./chain-rules";
import { loadExistingChainIndex } from "./novelty";
import { PLAY_TRACKING_SINCE, countedDailyIds, loadPlayedIds } from "./plays";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface GenerateOptions {
  length?: number;
  difficulty?: Difficulty;
  category?: string;
  count?: number;
  /** Leave out links scoring below this, whatever the difficulty. */
  minLinkScore?: number;
}

export interface BuildOptions extends GenerateOptions {
  /** Lowercase "first second" keys of links to avoid, e.g. recent dailies. */
  excludeLinks?: ReadonlySet<string>;
  /** Lowercase "a|b|c|d|e" keys of chains that already exist as puzzles. */
  excludeChains?: ReadonlySet<string>;
  random?: () => number;
}

export interface CandidateChain {
  words: string[];
  phrases: string[];
  difficulty: Difficulty;
  theme: string | null;
  score: number;
}

export interface PhraseNode {
  word_a: string;
  word_b: string;
  phrase: string;
  commonness_score: number;
  category: string | null;
}

/** Lowest link score a chain of each difficulty may contain. */
const MIN_LINK_SCORE: Record<Difficulty, number> = { easy: 8, medium: 5, hard: 1 };

/** How many days back a daily's links stay off limits. */
const RECENT_DAILY_DAYS = 30;

/** Search steps allowed per start word before giving up on it. */
const MAX_WALK_STEPS = 2000;

/** A start word may have this many outgoing links at most. */
const MAX_START_LINKS = 20;

const PAGE_SIZE = 1000;

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

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
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
/*  Chain walk — randomised depth-first search                         */
/* ------------------------------------------------------------------ */

/**
 * Finds one chain of `targetLength` words from `startWord` that `accept`
 * approves, trying links in random order and backtracking from dead ends.
 */
function walkChain(
  graph: Map<string, PhraseNode[]>,
  startWord: string,
  targetLength: number,
  random: () => number,
  accept: (words: string[], links: PhraseNode[]) => boolean,
): { words: string[]; phraseNodes: PhraseNode[] } | null {
  const words = [startWord];
  const links: PhraseNode[] = [];
  let steps = 0;

  const extend = (): boolean => {
    if (words.length === targetLength) return accept(words, links);
    if (++steps > MAX_WALK_STEPS) return false;

    for (const link of shuffled(graph.get(words[words.length - 1]) ?? [], random)) {
      if (words.includes(link.word_b)) continue;
      words.push(link.word_b);
      links.push(link);
      if (countParticles(words) <= MAX_PARTICLES && extend()) return true;
      words.pop();
      links.pop();
    }
    return false;
  };

  return extend() ? { words, phraseNodes: links } : null;
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

/**
 * Builds chains from a set of phrases. Pure: all database state arrives as
 * arguments, so every caller applies the same rules.
 */
export function buildChains(phrases: PhraseNode[], options: BuildOptions = {}): CandidateChain[] {
  const {
    length = 5,
    difficulty,
    category,
    count = 25,
    minLinkScore = 1,
    excludeLinks,
    excludeChains,
    random = Math.random,
  } = options;

  // Ambiguity is judged against every phrase, not just the ones this run
  // may use: a rival in another category still confuses the player.
  const ambiguous = findAmbiguousLinks(phrases);
  const floor = Math.max(minLinkScore, difficulty ? MIN_LINK_SCORE[difficulty] : 1);

  const graph = buildGraph(
    phrases.filter((p) => {
      const key = linkKey(p.word_a, p.word_b);
      if (ambiguous.has(key) || excludeLinks?.has(key)) return false;
      if (p.commonness_score < floor) return false;
      return !category || p.category === category;
    }),
  );

  // Hub words ("over", "home") make dull openers; start elsewhere when possible.
  let starts = [...graph.entries()].filter(([, edges]) => edges.length <= MAX_START_LINKS);
  if (starts.length === 0) starts = [...graph.entries()];

  const candidates: CandidateChain[] = [];
  for (const [startWord] of shuffled(starts, random)) {
    if (candidates.length >= count) break;

    const result = walkChain(graph, startWord, length, random, (words, links) => {
      if (excludeChains?.has(words.map((w) => w.toLowerCase()).join("|"))) return false;
      return !difficulty || classifyDifficulty(links.map((l) => l.commonness_score)) === difficulty;
    });
    if (!result) continue;

    candidates.push({
      words: result.words,
      phrases: result.phraseNodes.map((p) => p.phrase),
      difficulty: classifyDifficulty(result.phraseNodes.map((p) => p.commonness_score)),
      theme: inferTheme(result.words, result.phraseNodes),
      score: scoreChain(result.words, result.phraseNodes),
    });
  }

  return candidates.sort((a, b) => b.score - a.score);
}

/** Every active phrase, paged because a single response stops at 1000 rows. */
export async function loadActivePhrases(db: SupabaseClient<Database>): Promise<PhraseNode[]> {
  const phrases: PhraseNode[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db
      .from("chain_phrases")
      .select("word_a, word_b, phrase, commonness_score, category")
      .eq("is_active", true)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`Failed to load phrases: ${error.message}`);
    phrases.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return phrases;
  }
}

/**
 * Links that count as recently used: those in dailies from the last
 * `RECENT_DAILY_DAYS` days that someone actually played, plus those in
 * today's and upcoming dailies.
 */
async function loadRecentDailyLinks(db: SupabaseClient<Database>): Promise<Set<string>> {
  const today = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - RECENT_DAILY_DAYS * 86_400_000).toISOString().slice(0, 10);

  const { data: scheduled, error: scheduleError } = await db
    .from("daily_chain_puzzles")
    .select("puzzle_id, publish_date")
    .gte("publish_date", since);
  if (scheduleError) throw new Error(`Failed to load recent dailies: ${scheduleError.message}`);

  const dailies = scheduled ?? [];
  const mayBeUnplayed = dailies
    .filter((daily) => daily.publish_date < today && daily.publish_date >= PLAY_TRACKING_SINCE)
    .map((daily) => daily.puzzle_id);
  const played = await loadPlayedIds(db, mayBeUnplayed);

  const ids = countedDailyIds(dailies, played, { today });
  const links = new Set<string>();
  if (ids.length === 0) return links;

  const { data: puzzles, error: puzzleError } = await db
    .from("chain_puzzles")
    .select("words")
    .in("id", ids);
  if (puzzleError) throw new Error(`Failed to load recent puzzles: ${puzzleError.message}`);

  for (const row of puzzles ?? []) {
    const words = Array.isArray(row.words) ? (row.words as string[]) : [];
    for (let i = 0; i < words.length - 1; i++) links.add(linkKey(words[i], words[i + 1]));
  }
  return links;
}

/**
 * The rules a chain from any source must pass, loaded from current data.
 * Use with `chainProblems` to vet chains the phrase graph did not build.
 */
export async function loadChainRules(db: SupabaseClient<Database>): Promise<ChainRules> {
  const [phrases, recentLinks] = await Promise.all([loadActivePhrases(db), loadRecentDailyLinks(db)]);
  return { ambiguous: findAmbiguousLinks(phrases), recentLinks };
}

export async function generateChains(
  db: SupabaseClient<Database>,
  options: GenerateOptions = {},
): Promise<CandidateChain[]> {
  const length = options.length ?? 5;

  const [phrases, recentLinks, existing] = await Promise.all([
    loadActivePhrases(db),
    loadRecentDailyLinks(db),
    loadExistingChainIndex(db),
  ]);

  if (phrases.length < length - 1) {
    throw new Error(
      `Not enough phrases in database (need at least ${length - 1}, have ${phrases.length})`,
    );
  }

  return buildChains(phrases, {
    ...options,
    excludeLinks: recentLinks,
    excludeChains: existing.chains,
  });
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
    words: c.words,
    phrases: c.phrases,
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
