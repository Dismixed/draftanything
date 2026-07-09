import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import seedPuzzle from "./seed-puzzle.json";
import type { DailyPuzzleClient, RoundKey } from "./types";
import { getDateString } from "./game-logic";

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

export async function getDailyPuzzle(
  db: SupabaseClient,
): Promise<DailyPuzzleClient | null> {
  const today = getDateString();

  const { data: scheduled } = await db
    .from("daily_frames_puzzles")
    .select("puzzle_id, frames_puzzles(movie, song, show, album)")
    .eq("publish_date", today)
    .maybeSingle();

  const joined = scheduled?.frames_puzzles as PuzzleRow | null | undefined;
  if (joined) {
    return { date: today, rounds: stripAnswers(joined) };
  }

  const { data: fallback } = await db
    .from("frames_puzzles")
    .select("movie, song, show, album")
    .eq("status", "approved")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fallback) {
    return { date: today, rounds: stripAnswers(fallback as PuzzleRow) };
  }

  const seed = getSeedPuzzle();
  return { date: today, rounds: stripAnswers(seed) };
}

export async function getDailyAnswers(
  db: SupabaseClient,
): Promise<Record<RoundKey, string>> {
  const today = getDateString();

  const { data: scheduled } = await db
    .from("daily_frames_puzzles")
    .select("frames_puzzles(movie, song, show, album)")
    .eq("publish_date", today)
    .maybeSingle();

  const joined = scheduled?.frames_puzzles as PuzzleRow | null | undefined;
  if (joined) {
    return {
      movie: getAnswerForRound("movie", joined),
      song: getAnswerForRound("song", joined),
      show: getAnswerForRound("show", joined),
      album: getAnswerForRound("album", joined),
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
