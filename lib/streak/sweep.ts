import { DAILY_GAMES, type StreakStore } from "./types";

/** A Sweep is a day on which every daily was played. */
export function isSweep(store: StreakStore, date: string): boolean {
  return DAILY_GAMES.every((id) => store.games[id].playDates.includes(date));
}

export function sweepCount(store: StreakStore): number {
  const [first, ...rest] = DAILY_GAMES;
  const others = rest.map((id) => new Set(store.games[id].playDates));
  let count = 0;
  for (const date of new Set(store.games[first].playDates)) {
    if (others.every((dates) => dates.has(date))) count++;
  }
  return count;
}
