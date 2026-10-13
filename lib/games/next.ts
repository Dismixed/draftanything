import { DAILY_GAMES, type DailyGameId } from "@/lib/games/registry";

/** The first daily in lineup order that has not been played today, or null when all are done. */
export function nextDaily(played: ReadonlySet<DailyGameId>): DailyGameId | null {
  return DAILY_GAMES.find((id) => !played.has(id)) ?? null;
}

/** The unplayed dailies after the one `nextDaily` returns, in lineup order. */
export function remainingDailies(played: ReadonlySet<DailyGameId>): DailyGameId[] {
  return DAILY_GAMES.filter((id) => !played.has(id)).slice(1);
}
