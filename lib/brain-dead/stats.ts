import { getDateString } from "./game-logic";

export interface PersonalStats {
  bestScore: number;
  gamesPlayed: number;
  currentStreak: number;
}

export interface LocalPersonalStats {
  bestScore: number;
  playDates: string[];
}

export function computeStreak(
  playDates: string[],
  today = getDateString(),
): number {
  if (playDates.length === 0) return 0;

  const dateSet = new Set(playDates);
  const cursor = new Date(`${today}T12:00:00`);

  if (!dateSet.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (dateSet.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function buildPersonalStats(
  playDates: string[],
  bestScore: number,
): PersonalStats {
  const uniqueDates = [...new Set(playDates)].sort();
  return {
    bestScore,
    gamesPlayed: uniqueDates.length,
    currentStreak: computeStreak(uniqueDates),
  };
}

export function mergePersonalStats(
  ...sources: Array<{ bestScore: number; playDates: string[] }>
): PersonalStats {
  const playDates = [...new Set(sources.flatMap((s) => s.playDates))];
  const bestScore = sources.reduce(
    (max, source) => Math.max(max, source.bestScore),
    0,
  );
  return buildPersonalStats(playDates, bestScore);
}

export function formatScore(value: number): string {
  return value > 0 ? value.toLocaleString("en-US") : "—";
}

export function formatStreak(days: number): string {
  if (days <= 0) return "—";
  return `${days} day${days === 1 ? "" : "s"}`;
}
