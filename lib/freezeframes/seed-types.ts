import type { RoundKey } from "./types";

export const SEED_ENTRY_STATUSES = [
  "draft",
  "needs_media",
  "needs_review",
  "approved",
  "rejected",
  "used",
] as const;

export type SeedEntryStatus = (typeof SEED_ENTRY_STATUSES)[number];

export const EXTERNAL_SOURCES = [
  "tmdb_movie_still",
  "tmdb_episode_still",
  "tmdb_tv",
  "tvmaze_episode",
  "itunes_song",
  "itunes_album",
] as const;

export type ExternalSource = (typeof EXTERNAL_SOURCES)[number];

export interface SeedEntryRow {
  id: string;
  round_key: RoundKey;
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
  created_at: string;
  updated_at: string;
}

export interface ResolvedMedia {
  answer: string;
  hint?: string;
  artist?: string;
  album_name?: string;
  img?: string;
  audio?: string;
  external_id?: string;
  external_source?: ExternalSource;
  resolve_notes?: string;
  metadata?: Record<string, unknown>;
}

export interface GenerateBundleResult {
  puzzleId: string;
  movie: string;
  song: string;
  show: string;
  album: string;
}

export interface GenerateAllResult {
  bundlesCreated: number;
  skipped: number;
  results: GenerateBundleResult[];
  gaps: Array<{ round_key: RoundKey; issue: string }>;
}
