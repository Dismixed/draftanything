import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { RoundKey } from "./types";

export interface FramesPuzzleRow {
  id: string;
  movie: Record<string, unknown>;
  song: Record<string, unknown>;
  show: Record<string, unknown>;
  album: Record<string, unknown>;
  status: string;
  created_at: string;
}

function parseRound(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

function rowToPuzzle(row: Record<string, unknown>): FramesPuzzleRow {
  return {
    id: row.id as string,
    movie: parseRound(row.movie),
    song: parseRound(row.song),
    show: parseRound(row.show),
    album: parseRound(row.album),
    status: row.status as string,
    created_at: row.created_at as string,
  };
}

export function roundLabel(round: Record<string, unknown>): string {
  return String(round.answer ?? "—");
}

export async function listPuzzles(
  db: SupabaseClient<Database>,
  filters?: { status?: string; limit?: number; offset?: number },
): Promise<{ puzzles: FramesPuzzleRow[]; total: number }> {
  const limit = Math.min(filters?.limit ?? 100, 500);
  const offset = filters?.offset ?? 0;

  let query = db
    .from("freezeframes_puzzles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    puzzles: (data ?? []).map((row) => rowToPuzzle(row as Record<string, unknown>)),
    total: count ?? 0,
  };
}

export async function getPuzzle(
  db: SupabaseClient<Database>,
  id: string,
): Promise<FramesPuzzleRow | null> {
  const { data, error } = await db
    .from("freezeframes_puzzles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return rowToPuzzle(data as Record<string, unknown>);
}

export async function updatePuzzleStatus(
  db: SupabaseClient<Database>,
  id: string,
  status: string,
): Promise<FramesPuzzleRow> {
  const { data, error } = await db
    .from("freezeframes_puzzles")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToPuzzle(data as Record<string, unknown>);
}

export async function updatePuzzleRounds(
  db: SupabaseClient<Database>,
  id: string,
  rounds: Partial<Record<RoundKey, Record<string, unknown>>>,
): Promise<FramesPuzzleRow> {
  const update: Database["public"]["Tables"]["freezeframes_puzzles"]["Update"] = {};
  if (rounds.movie) update.movie = rounds.movie as Json;
  if (rounds.song) update.song = rounds.song as Json;
  if (rounds.show) update.show = rounds.show as Json;
  if (rounds.album) update.album = rounds.album as Json;

  const { data, error } = await db
    .from("freezeframes_puzzles")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToPuzzle(data as Record<string, unknown>);
}

export async function deletePuzzle(db: SupabaseClient<Database>, id: string): Promise<void> {
  const { error } = await db.from("freezeframes_puzzles").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
