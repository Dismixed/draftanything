import { PUZZLE_GAMES, type PuzzleGameId } from "@/lib/games/registry";
import type { StreakStore } from "./types";

/**
 * The first daily date each later puzzle counted towards a Sweep. A day before that is judged
 * without it, so adding a puzzle never takes away Sweeps a player has already earned.
 */
export const SWEEP_SINCE: Partial<Record<PuzzleGameId, string>> = {
  "dead-reckoning": "2026-11-17",
};

/** The puzzles a Sweep on `date` needed. Daily dates are YYYY-MM-DD, so they compare as strings. */
export function sweepPuzzles(date: string): PuzzleGameId[] {
  return PUZZLE_GAMES.filter((id) => (SWEEP_SINCE[id] ?? "") <= date);
}

/** A Sweep is a day on which every puzzle of that day was played. Hot Takes is not required. */
export function isSweep(store: StreakStore, date: string): boolean {
  return sweepPuzzles(date).every((id) => store.games[id].playDates.includes(date));
}

export function sweepCount(store: StreakStore): number {
  // Every Sweep includes the puzzles that were there from the start, so their dates are the candidates.
  const [first] = PUZZLE_GAMES.filter((id) => !SWEEP_SINCE[id]);
  let count = 0;
  for (const date of new Set(store.games[first].playDates)) {
    if (isSweep(store, date)) count++;
  }
  return count;
}
