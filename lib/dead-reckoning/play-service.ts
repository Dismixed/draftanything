import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { Guess } from "./scoring";

type Db = SupabaseClient<Database>;

export interface Player {
  userId: string | null;
  guestId: string | null;
}

/** Most plays read back to build one day's fleet. */
const MAX_PLAYS = 5000;

/** Reads stored guesses defensively: anything malformed becomes a blank leg. */
export function toGuesses(raw: Json): Guess[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((g) => (typeof g === "number" && g > 0 && Number.isFinite(g) ? g : null));
}

async function findOwn(db: Db, date: string, player: Player): Promise<{ guesses: Guess[]; days: number } | null> {
  const query = db.from("dead_reckoning_plays").select("guesses, days").eq("play_date", date);
  const { data, error } = await (player.userId ? query.eq("user_id", player.userId) : query.eq("guest_id", player.guestId!)).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { guesses: toGuesses(data.guesses), days: data.days } : null;
}

/**
 * Stores the player's voyage for the day and returns the one that counts. The first
 * voyage of the day is kept; a later post never replaces it.
 */
/** `created` is true only for the call that stored the play; repeats return the first one. */
export async function recordPlay(
  db: Db,
  date: string,
  guesses: Guess[],
  days: number,
  player: Player,
): Promise<{ guesses: Guess[]; days: number; created: boolean }> {
  const existing = await findOwn(db, date, player);
  if (existing) return { ...existing, created: false };

  const { error } = await db.from("dead_reckoning_plays").insert({
    play_date: date,
    guesses: guesses as unknown as Json,
    days,
    user_id: player.userId,
    guest_id: player.userId ? null : player.guestId,
  });
  if (error) {
    // Two posts from the same player can race; the unique index lets one in.
    const raced = await findOwn(db, date, player);
    if (raced) return { ...raced, created: false };
    throw new Error(error.message);
  }
  return { guesses, days, created: true };
}

export async function loadDay(db: Db, date: string): Promise<Guess[][]> {
  const { data, error } = await db.from("dead_reckoning_plays").select("guesses").eq("play_date", date).limit(MAX_PLAYS);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toGuesses(row.guesses));
}
