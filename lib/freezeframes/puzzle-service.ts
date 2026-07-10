import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import seedPuzzle from "./seed-puzzle.json";
import { getDateString } from "./game-logic";
import { scheduleDailyPuzzle } from "./schedule-service";
import type { DailyPuzzleClient, RoundKey } from "./types";

interface PuzzleRow {
  movie: Record<string, unknown>;
  song: Record<string, unknown>;
  show: Record<string, unknown>;
  album: Record<string, unknown>;
}

function stripAnswers(puzzle: PuzzleRow): DailyPuzzleClient["rounds"] {
  const keys: RoundKey[] = ["movie", "song", "show", "album"];
  const rounds = {} as DailyPuzzleClient["rounds"];
  for (const key of keys) {
    const { answer: _answer, ...rest } = puzzle[key] as Record<string, unknown> & {
      answer?: string;
    };
    rounds[key] = rest as unknown as DailyPuzzleClient["rounds"][RoundKey];
  }
  return rounds;
}

function getSeedPuzzle(): PuzzleRow {
  return seedPuzzle as PuzzleRow;
}

export function getAnswerForRound(roundKey: RoundKey, puzzle?: PuzzleRow): string {
  const source = puzzle ?? getSeedPuzzle();
  return String(source[roundKey].answer ?? "");
}

async function getScheduledPuzzleRow(
  db: SupabaseClient,
  date: string,
): Promise<PuzzleRow | null> {
  const { data: scheduled, error } = await db
    .from("daily_freezeframes_puzzles")
    .select("puzzle_id, freezeframes_puzzles(movie, song, show, album)")
    .eq("publish_date", date)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load scheduled puzzle: ${error.message}`);
  }

  const joined = scheduled?.freezeframes_puzzles as PuzzleRow | null | undefined;
  return joined ?? null;
}

async function resolveTodayPuzzleRow(
  db: SupabaseClient,
  date: string,
): Promise<PuzzleRow | null> {
  const scheduled = await getScheduledPuzzleRow(db, date);
  if (scheduled) return scheduled;

  await scheduleDailyPuzzle(db, date);
  return getScheduledPuzzleRow(db, date);
}

export async function getDailyPuzzle(
  db: SupabaseClient,
): Promise<DailyPuzzleClient | null> {
  const today = getDateString();
  const puzzle = await resolveTodayPuzzleRow(db, today);
  if (puzzle) {
    return { date: today, rounds: stripAnswers(puzzle) };
  }

  const seed = getSeedPuzzle();
  return { date: today, rounds: stripAnswers(seed) };
}

export async function getDailyAnswers(
  db: SupabaseClient,
): Promise<Record<RoundKey, string>> {
  const today = getDateString();
  const puzzle = await resolveTodayPuzzleRow(db, today);
  if (puzzle) {
    return {
      movie: getAnswerForRound("movie", puzzle),
      song: getAnswerForRound("song", puzzle),
      show: getAnswerForRound("show", puzzle),
      album: getAnswerForRound("album", puzzle),
    };
  }

  const seed = getSeedPuzzle();
  return {
    movie: getAnswerForRound("movie", seed),
    song: getAnswerForRound("song", seed),
    show: getAnswerForRound("show", seed),
    album: getAnswerForRound("album", seed),
  };
}
