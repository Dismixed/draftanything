import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  listAvailableApprovedByRound,
  seedEntryToRoundJson,
  updateSeedEntry,
} from "./seed-db";
import type { GenerateAllResult } from "./seed-types";
import type { RoundKey } from "./types";

const ROUND_KEYS: RoundKey[] = ["movie", "song", "show", "album"];

export async function generatePuzzleBundles(
  db: SupabaseClient<Database>,
  options?: { maxBundles?: number },
): Promise<GenerateAllResult> {
  const maxBundles = options?.maxBundles ?? 10;
  const buckets = await listAvailableApprovedByRound(db);

  const gaps: GenerateAllResult["gaps"] = [];
  for (const key of ROUND_KEYS) {
    if (buckets[key].length === 0) {
      gaps.push({ round_key: key, issue: "no approved entries available" });
    }
  }

  const possible = Math.min(...ROUND_KEYS.map((k) => buckets[k].length));
  const toCreate = Math.min(possible, maxBundles);

  const results: GenerateAllResult["results"] = [];

  for (let i = 0; i < toCreate; i++) {
    const picks: Record<RoundKey, (typeof buckets)[RoundKey][number]> = {
      movie: buckets.movie[i],
      song: buckets.song[i],
      show: buckets.show[i],
      album: buckets.album[i],
    };

    const { data: puzzle, error } = await db
      .from("freezeframes_puzzles")
      .insert({
        movie: seedEntryToRoundJson(picks.movie),
        song: seedEntryToRoundJson(picks.song),
        show: seedEntryToRoundJson(picks.show),
        album: seedEntryToRoundJson(picks.album),
        status: "draft",
      })
      .select("id")
      .single();

    if (error || !puzzle) {
      throw new Error(error?.message ?? "Failed to create puzzle bundle");
    }

    for (const key of ROUND_KEYS) {
      await updateSeedEntry(db, picks[key].id, {
        puzzle_id: puzzle.id,
        status: "used",
      });
    }

    results.push({
      puzzleId: puzzle.id,
      movie: picks.movie.answer ?? picks.movie.query_title,
      song: picks.song.answer ?? picks.song.query_title,
      show: picks.show.answer ?? picks.show.query_title,
      album: picks.album.answer ?? picks.album.query_title,
    });
  }

  return {
    bundlesCreated: results.length,
    skipped: possible - toCreate,
    results,
    gaps,
  };
}
