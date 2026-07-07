/** Clue types stored in ag_seed_entries (excludes auto-generated flag). */
export const SEED_CLUE_TYPES = [
  "currency",
  "jersey",
  "brand",
  "landmark",
  "written_language",
  "person",
  "food",
  "environment",
] as const;

export type SeedClueType = (typeof SEED_CLUE_TYPES)[number];

export const SEED_ENTRY_STATUSES = [
  "draft",
  "needs_image",
  "needs_review",
  "approved",
  "rejected",
] as const;

export type SeedEntryStatus = (typeof SEED_ENTRY_STATUSES)[number];

export interface ImageCandidate {
  image_url: string;
  thumb_url?: string;
  wiki_title?: string;
  source?: string;
  source_url?: string;
  license?: string;
  artist?: string;
  credit?: string;
}

export interface SeedEntryRow {
  id: string;
  cca3: string;
  country_common: string;
  clue_type: string;
  wiki_title: string | null;
  text_content: string | null;
  status: SeedEntryStatus;
  image_candidates: ImageCandidate[];
  selected_candidate_index: number;
  vision_pass: boolean | null;
  vision_notes: string | null;
  proposed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CountryAliasRow {
  id: string;
  cca3: string;
  alias: string;
  created_at: string;
}

export interface CoverageGap {
  cca3: string;
  country: string;
  clueType: string;
  issue: "missing_image" | "missing_wiki_title" | "missing_text" | "rejected";
  wikiTitle?: string | null;
}

export interface GenerateCoverageReport {
  totalCountries: number;
  gaps: CoverageGap[];
  missingImageCount: number;
}
