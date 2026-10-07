import { DAILY_GAMES, type DailyGameId, type GameId } from "@/lib/games/registry";

const MS_PER_DAY = 86_400_000;

/** Whole UTC days since the Unix epoch. Matches the day boundary used by `getDateString()`. */
export function utcDayNumber(date: Date = new Date()): number {
  return Math.floor(date.getTime() / MS_PER_DAY);
}

function rotationFrom(dayNumber: number): DailyGameId[] {
  const count = DAILY_GAMES.length;
  const start = ((dayNumber % count) + count) % count;
  return DAILY_GAMES.map((_, i) => DAILY_GAMES[(start + i) % count]);
}

export function featuredGameForDay(dayNumber: number): DailyGameId {
  return rotationFrom(dayNumber)[0];
}

export interface TodayView {
  /** The game in the featured slot, or null when every daily is played. */
  featured: DailyGameId | null;
  /** True when the day's featured game is already played and the slot shows the next one. */
  isUpNext: boolean;
  /** Every daily except the featured one: unplayed first, then played. */
  lineup: DailyGameId[];
  doneCount: number;
}

export function buildTodayView(dayNumber: number, played: ReadonlySet<DailyGameId>): TodayView {
  const rotation = rotationFrom(dayNumber);
  const featured = rotation.find((id) => !played.has(id)) ?? null;
  const rest = rotation.filter((id) => id !== featured);

  return {
    featured,
    isUpNext: featured !== null && featured !== rotation[0],
    lineup: [...rest.filter((id) => !played.has(id)), ...rest.filter((id) => played.has(id))],
    doneCount: rotation.filter((id) => played.has(id)).length,
  };
}

export function msUntilNextUtcDay(now: number): number {
  return MS_PER_DAY - (now % MS_PER_DAY);
}

export function formatCountdown(ms: number): string {
  const totalMinutes = Math.ceil(Math.max(0, ms) / 60_000);
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

/** The next `count` dailies after `gameId` in rotation order, skipping `gameId` itself. */
export function otherDailies(gameId: GameId, count = 3): DailyGameId[] {
  const index = (DAILY_GAMES as readonly string[]).indexOf(gameId);
  const start = index === -1 ? 0 : index + 1;
  return DAILY_GAMES.map((_, i) => DAILY_GAMES[(start + i) % DAILY_GAMES.length])
    .filter((id) => id !== gameId)
    .slice(0, count);
}
