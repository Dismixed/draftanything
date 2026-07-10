import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { PuzzleRow } from "./types";

function parseClues(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((c): c is string => typeof c === "string");
}

function mapRow(row: {
  id: string;
  answer: string;
  clues: unknown;
  status: string;
  created_at: string;
}): PuzzleRow {
  return {
    id: row.id,
    answer: row.answer,
    clues: parseClues(row.clues),
    status: row.status,
    created_at: row.created_at,
  };
}

export async function listPuzzles(
  db: SupabaseClient<Database>,
  options: { status?: string; limit?: number; offset?: number } = {},
): Promise<{ puzzles: PuzzleRow[]; total: number }> {
  const limit = options.limit ?? 100;
  const offset = options.offset ?? 0;

  let query = db
    .from("getting_warmer_puzzles")
    .select("id, answer, clues, status, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.status) {
    query = query.eq("status", options.status);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to list puzzles: ${error.message}`);
  }

  return {
    puzzles: (data ?? []).map(mapRow),
    total: count ?? 0,
  };
}

export async function createPuzzle(
  db: SupabaseClient<Database>,
  input: { answer: string; clues: string[]; status?: string },
): Promise<PuzzleRow> {
  const { data, error } = await db
    .from("getting_warmer_puzzles")
    .insert({
      answer: input.answer.trim().toUpperCase(),
      clues: input.clues.map((c) => c.trim()).filter(Boolean),
      status: input.status ?? "draft",
    })
    .select("id, answer, clues, status, created_at")
    .single();

  if (error) {
    throw new Error(`Failed to create puzzle: ${error.message}`);
  }

  return mapRow(data);
}

export async function updatePuzzleStatus(
  db: SupabaseClient<Database>,
  id: string,
  status: string,
): Promise<PuzzleRow> {
  const { data, error } = await db
    .from("getting_warmer_puzzles")
    .update({ status })
    .eq("id", id)
    .select("id, answer, clues, status, created_at")
    .single();

  if (error) {
    throw new Error(`Failed to update puzzle: ${error.message}`);
  }

  return mapRow(data);
}

export async function updatePuzzle(
  db: SupabaseClient<Database>,
  id: string,
  input: { answer?: string; clues?: string[]; status?: string },
): Promise<PuzzleRow> {
  const patch: {
    answer?: string;
    clues?: string[];
    status?: string;
  } = {};
  if (input.answer !== undefined) patch.answer = input.answer.trim().toUpperCase();
  if (input.clues !== undefined) {
    patch.clues = input.clues.map((c) => c.trim()).filter(Boolean);
  }
  if (input.status !== undefined) patch.status = input.status;

  const { data, error } = await db
    .from("getting_warmer_puzzles")
    .update(patch)
    .eq("id", id)
    .select("id, answer, clues, status, created_at")
    .single();

  if (error) {
    throw new Error(`Failed to update puzzle: ${error.message}`);
  }

  return mapRow(data);
}
