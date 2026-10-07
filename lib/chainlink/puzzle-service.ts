import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { generateChains } from "./generator";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PlayablePuzzle {
  id: string;
  date?: string;
  mode: "daily" | "infinite";
  startWord: string;
  wordLengths: number[];
  firstLetters: string[];
  maxHints: number;
  difficulty: string;
  /** Full words array — exposed so the frontend can display/reference them */
  words: string[];
}

export interface PuzzlePayload {
  id: string;
  date?: string;
  mode: "daily" | "infinite";
  startWord: string;
  words: string[];
}

export interface GuessResult {
  correct: boolean;
  normalizedAnswer: string;
  nextFirstLetter: string | null;
  completed: boolean;
}

export interface HintResult {
  hint: string;
  penalty: number;
}

/* ------------------------------------------------------------------ */
/*  Daily — in-memory cache so fallback is same for everyone on a day  */
/* ------------------------------------------------------------------ */

const fallbackCache = new Map<string, PlayablePuzzle>();

/**
 * Reads the puzzle scheduled for `targetDate` (or null if none). Raises on
 * database errors so callers can distinguish "no puzzle" from "failed read".
 */
async function loadScheduledPuzzle(
  db: SupabaseClient<Database>,
  targetDate: string,
): Promise<PlayablePuzzle | null> {
  const { data: scheduled, error: schedError } = await db
    .from("daily_chain_puzzles")
    .select("puzzle_id, publish_date")
    .eq("publish_date", targetDate)
    .maybeSingle();

  if (schedError) throw schedError;
  if (!scheduled) return null;

  const { data: puzzle, error: puzzleError } = await db
    .from("chain_puzzles")
    .select("*")
    .eq("id", scheduled.puzzle_id)
    .single();

  if (puzzleError) throw puzzleError;
  if (!puzzle) return null;

  const words = puzzle.words as string[];
  return buildPlayablePuzzle(
    puzzle.id,
    words,
    "daily",
    puzzle.difficulty,
    scheduled.publish_date,
  );
}

/**
 * Generates a fresh chain from the curated phrase graph and schedules it for
 * `targetDate` on the fly, so a day with nothing on the calendar still gets a
 * single persisted puzzle (identical for every visitor). Returns null if
 * generation produced nothing or persistence failed.
 *
 * Note: the LLM semantic pass is intentionally skipped here — this is the hot
 * path that runs on a user's page load, and the phrase graph is already
 * curated. The generator still applies the ambiguity, particle and repeat
 * rules, and nobody reviews this chain, so it is held to medium or easier.
 */
async function generateOnDemandPuzzle(
  db: SupabaseClient<Database>,
  targetDate: string,
): Promise<PlayablePuzzle | null> {
  const chains = await generateChains(db, { length: 5, count: 1, minLinkScore: 5 });
  if (chains.length === 0) return null;

  const chain = chains[0];

  const { data: inserted, error: insertError } = await db
    .from("chain_puzzles")
    .insert({
      title: chain.words.join(" → "),
      words: chain.words,
      phrases: chain.phrases,
      difficulty: chain.difficulty,
      theme: chain.theme,
      status: "scheduled",
      score: chain.score,
      notes: "Auto-generated on demand — no puzzle was scheduled for this date.",
      created_by: "on-demand",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    console.error("[chainlink] on-demand insert failed:", insertError);
    return null;
  }

  const { error: scheduleError } = await db
    .from("daily_chain_puzzles")
    .insert({ publish_date: targetDate, puzzle_id: inserted.id });

  // Lost a race — another request already scheduled today's puzzle. Re-read
  // the winner so every visitor sees the same puzzle (our insert is orphaned,
  // which is harmless and self-heals).
  if (scheduleError && scheduleError.code === "23505") {
    return loadScheduledPuzzle(db, targetDate);
  }
  if (scheduleError) {
    console.error("[chainlink] on-demand schedule failed:", scheduleError);
    return null;
  }

  return buildPlayablePuzzle(
    inserted.id,
    chain.words,
    "daily",
    chain.difficulty,
    targetDate,
  );
}

export async function getDailyPuzzle(
  db: SupabaseClient<Database>,
  date?: string,
): Promise<PlayablePuzzle | null> {
  const targetDate = date ?? new Date().toISOString().slice(0, 10);

  // Check fallback cache first
  const cached = fallbackCache.get(targetDate);
  if (cached) return cached;

  // 1. Today's scheduled puzzle
  const scheduled = await loadScheduledPuzzle(db, targetDate);
  if (scheduled) {
    fallbackCache.set(targetDate, scheduled);
    return scheduled;
  }

  // 2. Nothing scheduled — generate one on demand and load it, so the game
  //    always has a puzzle for the day.
  try {
    const generated = await generateOnDemandPuzzle(db, targetDate);
    if (generated) {
      fallbackCache.set(targetDate, generated);
      return generated;
    }
  } catch (err) {
    console.error("[chainlink] on-demand generation failed:", err);
    // Fall through to the approved fallback below.
  }

  // 3. Last resort: pick a random approved puzzle, persist it to the daily
  //    schedule so every later visitor gets the same one, then return it.
  const fallback = await scheduleApprovedFallback(db, targetDate);
  if (fallback) {
    fallbackCache.set(targetDate, fallback);
    return fallback;
  }

  return null;
}

/**
 * Picks an approved/published puzzle and writes it to `daily_chain_puzzles`
 * for `targetDate`. Concurrent callers race on the unique publish_date —
 * losers re-read the winner so everyone still sees one shared puzzle.
 */
async function scheduleApprovedFallback(
  db: SupabaseClient<Database>,
  targetDate: string,
): Promise<PlayablePuzzle | null> {
  const { data: approved } = await db
    .from("chain_puzzles")
    .select("*")
    .in("status", ["approved", "published"])
    .order("score", { ascending: false })
    .limit(50);

  if (!approved || approved.length === 0) return null;

  const pick = approved[Math.floor(Math.random() * approved.length)];

  const { error: scheduleError } = await db
    .from("daily_chain_puzzles")
    .insert({ publish_date: targetDate, puzzle_id: pick.id });

  // Lost the race — another request already claimed the day. Serve theirs.
  if (scheduleError && scheduleError.code === "23505") {
    return loadScheduledPuzzle(db, targetDate);
  }
  if (scheduleError) {
    console.error("[chainlink] approved fallback schedule failed:", scheduleError);
    return null;
  }

  const words = pick.words as string[];
  return buildPlayablePuzzle(pick.id, words, "daily", pick.difficulty, targetDate);
}

/* ------------------------------------------------------------------ */
/*  Infinite (random) puzzle                                           */
/* ------------------------------------------------------------------ */

export async function getRandomApprovedPuzzle(
  db: SupabaseClient<Database>,
  options?: {
    difficulty?: string;
    excludeIds?: string[];
  },
): Promise<PlayablePuzzle | null> {
  const query = db
    .from("chain_puzzles")
    .select("*")
    .in("status", ["approved", "published"])
    .order("score", { ascending: false })
    .limit(50);

  const { data: puzzles, error } = await query;

  if (error) throw error;
  if (!puzzles || puzzles.length === 0) return null;

  // Filter by difficulty if provided
  let filtered = puzzles;
  if (options?.difficulty) {
    filtered = filtered.filter((p) => p.difficulty === options.difficulty);
  }

  // Exclude recently played
  if (options?.excludeIds && options.excludeIds.length > 0) {
    const excludeSet = new Set(options.excludeIds);
    filtered = filtered.filter((p) => !excludeSet.has(p.id));
  }

  if (filtered.length === 0) {
    // Fallback to any puzzle if nothing after filtering
    filtered = puzzles;
  }

  // Pick random
  const pick = filtered[Math.floor(Math.random() * filtered.length)];
  const words = pick.words as string[];

  return buildPlayablePuzzle(pick.id, words, "infinite", pick.difficulty);
}

/* ------------------------------------------------------------------ */
/*  Validate a guess                                                   */
/* ------------------------------------------------------------------ */

export async function validateGuess(
  db: SupabaseClient<Database>,
  puzzleId: string,
  position: number,
  guess: string,
): Promise<GuessResult> {
  const { data: puzzle, error } = await db
    .from("chain_puzzles")
    .select("words, phrases")
    .eq("id", puzzleId)
    .single();

  if (error || !puzzle) {
    throw new Error("Puzzle not found");
  }

  const words = puzzle.words as string[];
  const targetWord = words[position];

  if (!targetWord) {
    throw new Error("Invalid position");
  }

  const normalizedGuess = guess.trim().toLowerCase();
  const normalizedTarget = targetWord.toLowerCase();

  const correct = normalizedGuess === normalizedTarget;
  const completed = correct && position === words.length - 1;
  const nextFirstLetter =
    correct && position + 1 < words.length
      ? words[position + 1][0]
      : null;

  return {
    correct,
    normalizedAnswer: targetWord,
    nextFirstLetter,
    completed,
  };
}

/* ------------------------------------------------------------------ */
/*  Generate hint for a word                                          */
/* ------------------------------------------------------------------ */

export async function generateHint(
  db: SupabaseClient<Database>,
  puzzleId: string,
  position: number,
  revealedLetters: number,
): Promise<HintResult> {
  const { data: puzzle, error } = await db
    .from("chain_puzzles")
    .select("words")
    .eq("id", puzzleId)
    .single();

  if (error || !puzzle) {
    throw new Error("Puzzle not found");
  }

  const words = puzzle.words as string[];
  const word = words[position];

  if (!word) {
    throw new Error("Invalid position");
  }

  // Build hint: first letter + revealed + underscores for unrevealed
  const totalLetters = word.length;
  const revealedCount = Math.min(revealedLetters, totalLetters - 1);

  let hintStr = word[0];
  for (let i = 1; i < totalLetters; i++) {
    if (i <= revealedCount) {
      hintStr += word[i];
    } else {
      hintStr += "_";
    }
  }

  return {
    hint: hintStr,
    penalty: 25,
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function buildPlayablePuzzle(
  id: string,
  words: string[],
  mode: "daily" | "infinite",
  difficulty: string,
  date?: string,
): PlayablePuzzle {
  return {
    id,
    date,
    mode,
    startWord: words[0],
    wordLengths: words.map((w) => w.length),
    firstLetters: words.slice(1).map((w) => w[0]),
    maxHints: 4,
    difficulty,
    words,
  };
}
