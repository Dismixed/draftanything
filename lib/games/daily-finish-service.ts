import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { DAILY_MAX_ROUND_SCORE } from "@/lib/anyguessr/daily";
import { LINEUP_ROUNDS } from "@/lib/anyguessr/lineup";
import { MAX_SCORE as BALL_KNOWLEDGE_MAX } from "@/lib/ball-knowledge/game-logic";
import { getDailyQuestions, maxDailyScore } from "@/lib/brain-dead/daily-service";
import { MAX_DAILY_SCORE as FREEZEFRAMES_MAX } from "@/lib/freezeframes/game-logic";
import type { CompetitiveGameId, Direction } from "@/lib/games/percentile";
import { MAX_LEADERBOARD_GUESSES } from "@/lib/getting-warmer/game-logic";
import type { Database } from "@/lib/supabase/database.types";

type Db = SupabaseClient<Database>;

/** Same ceiling the Brain Dead leaderboard route uses when the day's questions cannot be read. */
const BRAIN_DEAD_CEILING = 6750;

export interface FinishPlayer {
  userId: string | null;
  guestId: string | null;
}

/** The lowest and highest score a player could honestly post for this game today. */
export async function scoreBounds(db: Db, game: CompetitiveGameId, playDate: string): Promise<{ min: number; max: number }> {
  switch (game) {
    case "brain-dead":
      try {
        return { min: 0, max: maxDailyScore(await getDailyQuestions(db, playDate)) };
      } catch (err) {
        console.error("Could not load the daily to bound a score:", err);
        return { min: 0, max: BRAIN_DEAD_CEILING };
      }
    case "anyguessr":
      return { min: 0, max: LINEUP_ROUNDS * DAILY_MAX_ROUND_SCORE };
    case "freezeframes":
      return { min: 0, max: FREEZEFRAMES_MAX };
    case "ball-knowledge":
      return { min: 0, max: BALL_KNOWLEDGE_MAX };
    case "getting-warmer":
      return { min: 1, max: MAX_LEADERBOARD_GUESSES };
  }
}

export async function findOwnScore(
  db: Db,
  game: CompetitiveGameId,
  playDate: string,
  player: FinishPlayer,
): Promise<number | null> {
  if (!player.userId && !player.guestId) return null;

  const query = db.from("daily_finishes").select("score").eq("game", game).eq("play_date", playDate);
  const { data, error } = await (player.userId
    ? query.eq("user_id", player.userId)
    : query.eq("guest_id", player.guestId!)
  ).maybeSingle();

  if (error) throw new Error(error.message);
  return data?.score ?? null;
}

/**
 * Stores the player's finish for the day and returns the stored score. A player's first
 * finish of the day is the one that counts: a later post never changes it.
 */
export async function recordFinish(
  db: Db,
  game: CompetitiveGameId,
  playDate: string,
  score: number,
  player: FinishPlayer,
): Promise<number> {
  const existing = await findOwnScore(db, game, playDate, player);
  if (existing !== null) return existing;

  const { error } = await db.from("daily_finishes").insert({
    game,
    play_date: playDate,
    score,
    user_id: player.userId,
    guest_id: player.userId ? null : player.guestId,
  });

  if (error) {
    // Two requests from the same player can race; the unique index lets one in. Use that one.
    const raced = await findOwnScore(db, game, playDate, player);
    if (raced !== null) return raced;
    throw new Error(error.message);
  }

  return score;
}

/** How many players finished this game today, and how many of them did strictly worse than `score`. */
export async function dayCounts(
  db: Db,
  game: CompetitiveGameId,
  playDate: string,
  score: number,
  direction: Direction,
): Promise<{ total: number; worse: number }> {
  const today = () =>
    db.from("daily_finishes").select("id", { count: "exact", head: true }).eq("game", game).eq("play_date", playDate);

  const [all, worse] = await Promise.all([
    today(),
    direction === "higher" ? today().lt("score", score) : today().gt("score", score),
  ]);

  if (all.error) throw new Error(all.error.message);
  if (worse.error) throw new Error(worse.error.message);
  return { total: all.count ?? 0, worse: worse.count ?? 0 };
}
