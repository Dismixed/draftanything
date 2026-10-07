import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Plays were not recorded before this date, so earlier dailies are assumed
 * to have been played. Safe to delete once it is more than 30 days old.
 */
export const PLAY_TRACKING_SINCE = "2026-10-09";

export interface Attempt {
  puzzleId: string;
  mode: "daily" | "infinite";
  completed: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseAttempt(body: unknown): Attempt | null {
  if (!body || typeof body !== "object") return null;
  const { puzzleId, mode, completed } = body as Record<string, unknown>;
  if (typeof puzzleId !== "string" || !UUID.test(puzzleId)) return null;
  if (mode !== "daily" && mode !== "infinite") return null;
  if (typeof completed !== "boolean") return null;
  return { puzzleId, mode, completed };
}

export async function recordAttempt(db: SupabaseClient<Database>, attempt: Attempt): Promise<void> {
  const { error } = await db.from("chain_puzzle_attempts").insert({
    puzzle_id: attempt.puzzleId,
    mode: attempt.mode,
    completed: attempt.completed,
  });
  if (error) throw new Error(`Failed to record attempt: ${error.message}`);
}

/** Which of `puzzleIds` have at least one recorded attempt. */
export async function loadPlayedIds(
  db: SupabaseClient<Database>,
  puzzleIds: readonly string[],
): Promise<Set<string>> {
  const played = new Set<string>();
  await Promise.all(
    puzzleIds.map(async (id) => {
      const { data, error } = await db
        .from("chain_puzzle_attempts")
        .select("puzzle_id")
        .eq("puzzle_id", id)
        .limit(1);
      if (error) throw new Error(`Failed to load attempts: ${error.message}`);
      if (data && data.length > 0) played.add(id);
    }),
  );
  return played;
}

/**
 * The dailies whose links count as used when avoiding repeats. A daily
 * nobody played has not really been seen, so it does not count; today's and
 * upcoming dailies count before anyone can have played them.
 */
export function countedDailyIds(
  dailies: ReadonlyArray<{ puzzle_id: string; publish_date: string }>,
  playedIds: ReadonlySet<string>,
  options: { today: string; trackingSince?: string },
): string[] {
  const trackingSince = options.trackingSince ?? PLAY_TRACKING_SINCE;
  return dailies
    .filter(
      (daily) =>
        daily.publish_date >= options.today ||
        daily.publish_date < trackingSince ||
        playedIds.has(daily.puzzle_id),
    )
    .map((daily) => daily.puzzle_id);
}
