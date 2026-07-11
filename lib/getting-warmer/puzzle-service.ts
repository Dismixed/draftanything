import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import seedPuzzle from "./seed-puzzle.json";
import { generateAiClue } from "./clue-generate";
import {
  INITIAL_CLUES,
  getDateString,
  getDayNumber,
  getLetterRevealClue,
} from "./game-logic";
import { scheduleDailyPuzzle } from "./schedule-service";
import type { DailyPuzzleClient } from "./types";

interface PuzzleContent {
  answer: string;
  clues: string[];
}

const puzzleContentCache = new Map<string, PuzzleContent>();
const dailyClientCache = new Map<string, DailyPuzzleClient>();

function parseClues(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((c): c is string => typeof c === "string" && c.trim().length > 0);
}

function getSeedPuzzle(): PuzzleContent {
  return {
    answer: seedPuzzle.answer,
    clues: seedPuzzle.clues,
  };
}

async function getScheduledPuzzleRow(
  db: SupabaseClient,
  date: string,
): Promise<PuzzleContent | null> {
  const { data, error } = await db
    .from("daily_getting_warmer_puzzles")
    .select("puzzle_id, getting_warmer_puzzles(answer, clues)")
    .eq("publish_date", date)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load scheduled puzzle: ${error.message}`);
  }

  const joined = data?.getting_warmer_puzzles as
    | { answer: string; clues: unknown }
    | null
    | undefined;

  if (!joined) return null;

  return {
    answer: joined.answer,
    clues: parseClues(joined.clues),
  };
}

async function loadPuzzleById(
  db: SupabaseClient,
  puzzleId: string,
): Promise<PuzzleContent | null> {
  const { data, error } = await db
    .from("getting_warmer_puzzles")
    .select("answer, clues")
    .eq("id", puzzleId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load puzzle: ${error.message}`);
  }
  if (!data) return null;

  return {
    answer: data.answer,
    clues: parseClues(data.clues),
  };
}

async function resolveTodayPuzzle(
  db: SupabaseClient,
  date: string,
): Promise<PuzzleContent> {
  const cached = puzzleContentCache.get(date);
  if (cached) return cached;

  const scheduled = await getScheduledPuzzleRow(db, date);
  if (scheduled) {
    puzzleContentCache.set(date, scheduled);
    return scheduled;
  }

  const scheduleResult = await scheduleDailyPuzzle(db, date);
  if (scheduleResult) {
    const loaded = await loadPuzzleById(db, scheduleResult.puzzleId);
    if (loaded) {
      puzzleContentCache.set(date, loaded);
      return loaded;
    }
  }

  const fallback = getSeedPuzzle();
  puzzleContentCache.set(date, fallback);
  return fallback;
}

export async function getDailyPuzzle(
  db: SupabaseClient,
): Promise<DailyPuzzleClient> {
  const today = getDateString();
  const cached = dailyClientCache.get(today);
  if (cached) return cached;

  const puzzle = await resolveTodayPuzzle(db, today);
  const initialClues = puzzle.clues.slice(0, INITIAL_CLUES);

  const client: DailyPuzzleClient = {
    date: today,
    dayNumber: getDayNumber(),
    initialClues,
    authoredClueCount: puzzle.clues.length,
  };
  dailyClientCache.set(today, client);
  return client;
}

export async function getDailyAnswer(db: SupabaseClient): Promise<PuzzleContent> {
  const today = getDateString();
  return resolveTodayPuzzle(db, today);
}

export async function resolveNextClue(
  db: SupabaseClient,
  options: {
    revealedClueCount: number;
    wrongGuesses: string[];
    extraClues: string[];
  },
): Promise<string> {
  const puzzle = await getDailyAnswer(db);
  const nextIndex = options.revealedClueCount;

  if (nextIndex < puzzle.clues.length) {
    return puzzle.clues[nextIndex]!;
  }

  const aiIndex = nextIndex - puzzle.clues.length;
  if (aiIndex < options.extraClues.length) {
    return options.extraClues[aiIndex]!;
  }

  return generateAiClue({
    answer: puzzle.answer,
    authoredClues: puzzle.clues,
    extraClues: options.extraClues,
    wrongGuesses: options.wrongGuesses,
    clueIndex: nextIndex,
  });
}

export function getFallbackClue(answer: string, clueIndex: number, authoredCount: number): string {
  const letterRevealIndex = clueIndex - authoredCount + 1;
  return getLetterRevealClue(answer, Math.max(1, letterRevealIndex));
}
