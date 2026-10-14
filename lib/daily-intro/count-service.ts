import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { COMPETITIVE_GAMES, type CompetitiveGameId } from "@/lib/games/percentile";
import type { DailyGameId } from "@/lib/games/registry";
import type { Database } from "@/lib/supabase/database.types";

type Db = SupabaseClient<Database>;

/** Below this many plays the intro shows a line without a number. */
export const INTRO_COUNT_FLOOR = 25;

const isCompetitive = (game: DailyGameId): game is CompetitiveGameId =>
  (COMPETITIVE_GAMES as readonly string[]).includes(game);

/**
 * How many people played `game` on `playDate`, or null when it is under the floor or the game
 * records no plays. Hot Takes stores nothing per play, so it is always null.
 */
export async function introCount(db: Db, game: DailyGameId, playDate: string): Promise<number | null> {
  let count: number | null;

  if (isCompetitive(game)) {
    const { count: n, error } = await db
      .from("daily_finishes")
      .select("id", { count: "exact", head: true })
      .eq("game", game)
      .eq("play_date", playDate);
    if (error) throw new Error(error.message);
    count = n;
  } else if (game === "chainlink") {
    // Chain Link records one attempt per finished daily, won or lost, with no play date column.
    const { count: n, error } = await db
      .from("chain_puzzle_attempts")
      .select("id", { count: "exact", head: true })
      .eq("mode", "daily")
      .gte("created_at", `${playDate}T00:00:00Z`)
      .lt("created_at", nextDay(playDate));
    if (error) throw new Error(error.message);
    count = n;
  } else {
    return null;
  }

  return count !== null && count >= INTRO_COUNT_FLOOR ? count : null;
}

function nextDay(playDate: string): string {
  const d = new Date(`${playDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}
