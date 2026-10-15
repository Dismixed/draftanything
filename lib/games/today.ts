import { FEATURED_GAMES, PUZZLE_GAMES, type DailyGameId, type GameId, type PuzzleGameId } from "@/lib/games/registry";

const MS_PER_DAY = 86_400_000;

/** Whole UTC days since the Unix epoch. Matches the day boundary used by `getDateString()`. */
export function utcDayNumber(date: Date = new Date()): number {
  return Math.floor(date.getTime() / MS_PER_DAY);
}

/** The three featured games, starting from the one whose turn it is on this day. */
function featuredRotation(dayNumber: number): PuzzleGameId[] {
  const count = FEATURED_GAMES.length;
  const start = ((dayNumber % count) + count) % count;
  return FEATURED_GAMES.map((_, i) => FEATURED_GAMES[(start + i) % count]);
}

export function featuredGameForDay(dayNumber: number): PuzzleGameId {
  return featuredRotation(dayNumber)[0];
}

export interface TodayView {
  /** The puzzle in the featured slot, or null when every puzzle is played. */
  featured: PuzzleGameId | null;
  /** True when the day's featured game is already played and the slot shows the next one. */
  isUpNext: boolean;
  /** Every puzzle except the featured one: unplayed first, then played. Hot Takes is not here. */
  lineup: PuzzleGameId[];
  doneCount: number;
}

export function buildTodayView(dayNumber: number, played: ReadonlySet<DailyGameId>): TodayView {
  const rotation = featuredRotation(dayNumber);
  // The slot works through the three featured games first, then the remaining dailies, so
  // it always has something to offer until every puzzle is played.
  const candidates = [...rotation, ...PUZZLE_GAMES.filter((id) => !rotation.includes(id))];
  const featured = candidates.find((id) => !played.has(id)) ?? null;
  const rest = PUZZLE_GAMES.filter((id) => id !== featured);

  return {
    featured,
    isUpNext: featured !== null && featured !== rotation[0],
    lineup: [...rest.filter((id) => !played.has(id)), ...rest.filter((id) => played.has(id))],
    doneCount: PUZZLE_GAMES.filter((id) => played.has(id)).length,
  };
}

export function msUntilNextUtcDay(now: number): number {
  return MS_PER_DAY - (now % MS_PER_DAY);
}

export function formatCountdown(ms: number): string {
  const totalMinutes = Math.ceil(Math.max(0, ms) / 60_000);
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

/** The next `count` puzzles after `gameId` in rotation order, skipping `gameId` itself. */
export function otherDailies(gameId: GameId, count = 3): PuzzleGameId[] {
  const index = (PUZZLE_GAMES as readonly string[]).indexOf(gameId);
  const start = index === -1 ? 0 : index + 1;
  return PUZZLE_GAMES.map((_, i) => PUZZLE_GAMES[(start + i) % PUZZLE_GAMES.length])
    .filter((id) => id !== gameId)
    .slice(0, count);
}
