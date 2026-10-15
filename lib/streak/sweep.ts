import { PUZZLE_GAMES } from "@/lib/games/registry";
import type { StreakStore } from "./types";

/** A Sweep is a day on which every puzzle was played. Hot Takes is not required. */
export function isSweep(store: StreakStore, date: string): boolean {
  return PUZZLE_GAMES.every((id) => store.games[id].playDates.includes(date));
}

export function sweepCount(store: StreakStore): number {
  const [first, ...rest] = PUZZLE_GAMES;
  const others = rest.map((id) => new Set(store.games[id].playDates));
  let count = 0;
  for (const date of new Set(store.games[first].playDates)) {
    if (others.every((dates) => dates.has(date))) count++;
  }
  return count;
}
