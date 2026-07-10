import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { FREEZEFRAMES_SEED } from "./seed";
import { mediaComplete, resolveSeedMedia } from "./sourcing";
import type { SeedEntryRow, SeedEntryStatus } from "./seed-types";
import type { RoundKey } from "./types";

export function seedEntryKey(roundKey: string, queryTitle: string): string {
  return `${roundKey}:${queryTitle.trim().toLowerCase()}`;
}

function parseMetadata(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

function rowToSeedEntry(row: Record<string, unknown>): SeedEntryRow {
  return {
    id: row.id as string,
    round_key: row.round_key as RoundKey,
    query_title: row.query_title as string,
    answer: (row.answer as string | null) ?? null,
    hint: (row.hint as string | null) ?? null,
    artist: (row.artist as string | null) ?? null,
    album_name: (row.album_name as string | null) ?? null,
    img: (row.img as string | null) ?? null,
    audio: (row.audio as string | null) ?? null,
    external_id: (row.external_id as string | null) ?? null,
    external_source: (row.external_source as string | null) ?? null,
    status: row.status as SeedEntryStatus,
    resolve_notes: (row.resolve_notes as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    puzzle_id: (row.puzzle_id as string | null) ?? null,
    metadata: parseMetadata(row.metadata),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function listSeedEntries(
  db: SupabaseClient<Database>,
  filters?: { status?: string; roundKey?: string; limit?: number },
): Promise<SeedEntryRow[]> {
  let query = db
    .from("freezeframes_seed_entries")
    .select("*")
    .order("round_key", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(filters?.limit ?? 5000);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.roundKey) query = query.eq("round_key", filters.roundKey);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => rowToSeedEntry(row as Record<string, unknown>));
}

export async function getSeedEntry(
  db: SupabaseClient<Database>,
  id: string,
): Promise<SeedEntryRow | null> {
  const { data, error } = await db
    .from("freezeframes_seed_entries")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return rowToSeedEntry(data as Record<string, unknown>);
}

export async function updateSeedEntry(
  db: SupabaseClient<Database>,
  id: string,
  patch: Partial<{
    query_title: string;
    answer: string | null;
    hint: string | null;
    artist: string | null;
    album_name: string | null;
    img: string | null;
    audio: string | null;
    external_id: string | null;
    external_source: string | null;
    status: SeedEntryStatus;
    resolve_notes: string | null;
    notes: string | null;
    puzzle_id: string | null;
    metadata: Record<string, unknown>;
  }>,
): Promise<SeedEntryRow> {
  const { data, error } = await db
    .from("freezeframes_seed_entries")
    .update({
      ...patch,
      metadata: patch.metadata as unknown as Json | undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToSeedEntry(data as Record<string, unknown>);
}

export async function createSeedEntry(
  db: SupabaseClient<Database>,
  entry: {
    round_key: RoundKey;
    query_title: string;
    notes?: string | null;
    status?: SeedEntryStatus;
  },
): Promise<SeedEntryRow> {
  const existingRows = await listSeedEntries(db, {
    roundKey: entry.round_key,
    limit: 5000,
  });
  const key = seedEntryKey(entry.round_key, entry.query_title);
  const duplicate = existingRows.find(
    (row) => seedEntryKey(row.round_key, row.query_title) === key,
  );
  if (duplicate) return duplicate;

  const { data, error } = await db
    .from("freezeframes_seed_entries")
    .insert({
      round_key: entry.round_key,
      query_title: entry.query_title,
      notes: entry.notes ?? null,
      status: entry.status ?? "draft",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToSeedEntry(data as Record<string, unknown>);
}

export async function importSeedFileToDb(
  db: SupabaseClient<Database>,
): Promise<{ imported: number; skipped: number }> {
  const existingRows = await listSeedEntries(db, { limit: 5000 });
  const existingKeys = new Set(
    existingRows.map((row) => seedEntryKey(row.round_key, row.query_title)),
  );

  let imported = 0;
  let skipped = 0;
  for (const item of FREEZEFRAMES_SEED) {
    const key = seedEntryKey(item.round_key, item.query_title);
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }

    const { error } = await db.from("freezeframes_seed_entries").insert({
      round_key: item.round_key,
      query_title: item.query_title,
      notes: item.notes ?? null,
      status: "draft",
    });
    if (!error) {
      imported++;
      existingKeys.add(key);
    }
  }
  return { imported, skipped };
}

export async function resolveEntryMedia(
  db: SupabaseClient<Database>,
  id: string,
): Promise<SeedEntryRow & { skippedResolve?: boolean }> {
  const entry = await getSeedEntry(db, id);
  if (!entry) throw new Error("Seed entry not found");

  if (entry.status !== "draft" && entry.status !== "needs_media") {
    return { ...entry, skippedResolve: true };
  }

  const resolved = await resolveSeedMedia(entry.round_key, entry.query_title);
  const complete = mediaComplete(entry.round_key, resolved);

  return updateSeedEntry(db, id, {
    answer: resolved.answer || entry.query_title,
    hint: resolved.hint ?? null,
    artist: resolved.artist ?? null,
    album_name: resolved.album_name ?? null,
    img: resolved.img ?? null,
    audio: resolved.audio ?? null,
    external_id: resolved.external_id ?? null,
    external_source: resolved.external_source ?? null,
    resolve_notes: resolved.resolve_notes ?? null,
    metadata: resolved.metadata ?? {},
    status: complete ? "needs_review" : "needs_media",
  });
}

export async function listAvailableApprovedByRound(
  db: SupabaseClient<Database>,
): Promise<Record<RoundKey, SeedEntryRow[]>> {
  const { data, error } = await db
    .from("freezeframes_seed_entries")
    .select("*")
    .eq("status", "approved")
    .is("puzzle_id", null)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const buckets: Record<RoundKey, SeedEntryRow[]> = {
    movie: [],
    song: [],
    show: [],
    album: [],
  };

  for (const row of data ?? []) {
    const entry = rowToSeedEntry(row as Record<string, unknown>);
    buckets[entry.round_key].push(entry);
  }

  return buckets;
}

export function seedEntryToRoundJson(entry: SeedEntryRow): Record<string, string> {
  const base: Record<string, string> = {
    answer: entry.answer ?? entry.query_title,
  };
  if (entry.hint) base.hint = entry.hint;
  if (entry.img) base.img = entry.img;
  if (entry.audio) base.audio = entry.audio;
  if (entry.artist) base.artist = entry.artist;
  if (entry.album_name) base.albumName = entry.album_name;
  return base;
}
