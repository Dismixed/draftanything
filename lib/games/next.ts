import { PUZZLE_GAMES, type DailyGameId, type PuzzleGameId } from "@/lib/games/registry";

/** The first puzzle in lineup order that has not been played today, or null when all are done. */
export function nextDaily(played: ReadonlySet<DailyGameId>): PuzzleGameId | null {
  return PUZZLE_GAMES.find((id) => !played.has(id)) ?? null;
}

/** The unplayed puzzles after the one `nextDaily` returns, in lineup order. */
export function remainingDailies(played: ReadonlySet<DailyGameId>): PuzzleGameId[] {
  return PUZZLE_GAMES.filter((id) => !played.has(id)).slice(1);
}
