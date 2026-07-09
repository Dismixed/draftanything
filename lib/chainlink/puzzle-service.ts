import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

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

export async function getDailyPuzzle(
  db: SupabaseClient<Database>,
  date?: string,
): Promise<PlayablePuzzle | null> {
  const targetDate = date ?? new Date().toISOString().slice(0, 10);

  // Check fallback cache first
  const cached = fallbackCache.get(targetDate);
  if (cached) return cached;

  // Find today's scheduled puzzle
  const { data: scheduled, error: schedError } = await db
    .from("daily_chain_puzzles")
    .select("puzzle_id, publish_date")
    .eq("publish_date", targetDate)
    .maybeSingle();

  if (schedError) throw schedError;

  if (scheduled) {
    const { data: puzzle, error: puzzleError } = await db
      .from("chain_puzzles")
      .select("*")
      .eq("id", scheduled.puzzle_id)
      .single();

    if (puzzleError) throw puzzleError;
    if (puzzle) {
      const words = puzzle.words as string[];
      const result = buildPlayablePuzzle(puzzle.id, words, "daily", puzzle.difficulty, scheduled.publish_date);
      fallbackCache.set(targetDate, result);
      return result;
    }
  }

  // Fallback: pick a random approved puzzle and cache it for the day
  const { data: approved } = await db
    .from("chain_puzzles")
    .select("*")
    .in("status", ["approved", "published"])
    .order("score", { ascending: false })
    .limit(50);

  if (approved && approved.length > 0) {
    const pick = approved[Math.floor(Math.random() * approved.length)];
    const words = pick.words as string[];
    const result = buildPlayablePuzzle(pick.id, words, "daily", pick.difficulty, targetDate);
    fallbackCache.set(targetDate, result);
    return result;
  }

  return null;
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
