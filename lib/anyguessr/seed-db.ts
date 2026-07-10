import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { SEED, type SeedEntry } from "./seed";
import { SEED_IMAGE_ALTS } from "./seed-image-alts";
import type {
  CountryAliasRow,
  GenerateCoverageReport,
  ImageCandidate,
  SeedEntryRow,
  SeedEntryStatus,
} from "./seed-types";
import { ADMIN_CLUE_TYPES, SEED_CLUE_TYPES } from "./seed-types";
import { getFlagUrlForCca3 } from "./country-geo";

function parseCandidates(raw: unknown): ImageCandidate[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is ImageCandidate =>
      !!item &&
      typeof item === "object" &&
      typeof (item as ImageCandidate).image_url === "string",
  );
}

function rowToSeedEntry(row: Record<string, unknown>): SeedEntryRow {
  return {
    id: row.id as string,
    cca3: row.cca3 as string,
    country_common: row.country_common as string,
    clue_type: row.clue_type as string,
    wiki_title: (row.wiki_title as string | null) ?? null,
    text_content: (row.text_content as string | null) ?? null,
    status: row.status as SeedEntryStatus,
    image_candidates: parseCandidates(row.image_candidates),
    selected_candidate_index: (row.selected_candidate_index as number) ?? 0,
    vision_pass: (row.vision_pass as boolean | null) ?? null,
    vision_notes: (row.vision_notes as string | null) ?? null,
    proposed_by: (row.proposed_by as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export async function listSeedEntries(
  db: SupabaseClient<Database>,
  filters?: { status?: string; cca3?: string; clueType?: string; limit?: number },
): Promise<SeedEntryRow[]> {
  let query = db
    .from("ag_seed_entries")
    .select("*")
    .order("country_common", { ascending: true })
    .order("clue_type", { ascending: true })
    .limit(filters?.limit ?? 5000);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.cca3) query = query.eq("cca3", filters.cca3);
  if (filters?.clueType) query = query.eq("clue_type", filters.clueType);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => rowToSeedEntry(row as Record<string, unknown>));
}

export async function getSeedEntry(
  db: SupabaseClient<Database>,
  id: string,
): Promise<SeedEntryRow | null> {
  const { data, error } = await db
    .from("ag_seed_entries")
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
    wiki_title: string | null;
    text_content: string | null;
    status: SeedEntryStatus;
    image_candidates: ImageCandidate[];
    selected_candidate_index: number;
    vision_pass: boolean | null;
    vision_notes: string | null;
    notes: string | null;
  }>,
): Promise<SeedEntryRow> {
  const { data, error } = await db
    .from("ag_seed_entries")
    .update({
      ...patch,
      image_candidates: patch.image_candidates as unknown as Json | undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToSeedEntry(data as Record<string, unknown>);
}

export async function upsertSeedEntry(
  db: SupabaseClient<Database>,
  entry: {
    cca3: string;
    country_common: string;
    clue_type: string;
    wiki_title?: string | null;
    text_content?: string | null;
    status?: SeedEntryStatus;
    image_candidates?: ImageCandidate[];
    selected_candidate_index?: number;
    vision_pass?: boolean | null;
    vision_notes?: string | null;
    proposed_by?: string | null;
    notes?: string | null;
  },
): Promise<SeedEntryRow> {
  const { data, error } = await db
    .from("ag_seed_entries")
    .upsert(
      {
        cca3: entry.cca3,
        country_common: entry.country_common,
        clue_type: entry.clue_type,
        wiki_title: entry.wiki_title ?? null,
        text_content: entry.text_content ?? null,
        status: entry.status ?? "draft",
        image_candidates: (entry.image_candidates ?? []) as unknown as Json,
        selected_candidate_index: entry.selected_candidate_index ?? 0,
        vision_pass: entry.vision_pass ?? null,
        vision_notes: entry.vision_notes ?? null,
        proposed_by: entry.proposed_by ?? null,
        notes: entry.notes ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "cca3,clue_type" },
    )
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToSeedEntry(data as Record<string, unknown>);
}

function wikiTitleForSeedField(seed: SeedEntry, clueType: string): string | null {
  switch (clueType) {
    case "environment":
      return seed.environment;
    case "person":
      return seed.person;
    case "food":
      return seed.food;
    case "landmark":
      return seed.landmark;
    case "jersey":
      return seed.jersey;
    case "brand":
      return seed.brand;
    case "currency":
      return seed.currency;
    case "wildlife":
      return seed.wildlife;
    case "written_language":
      return null;
    default:
      return null;
  }
}

function textForSeedField(seed: SeedEntry, clueType: string): string | null {
  if (clueType === "written_language") return seed.written_language;
  return null;
}

/** Import lib/anyguessr/seed.ts rows into ag_seed_entries (idempotent). */
export async function importSeedFileToDb(
  db: SupabaseClient<Database>,
): Promise<{ imported: number }> {
  const existingRows = await listSeedEntries(db, { limit: 5000 });
  const existingByKey = new Map(
    existingRows.map((row) => [`${row.cca3}:${row.clue_type}`, row]),
  );

  let imported = 0;
  for (const seed of SEED) {
    for (const clueType of ADMIN_CLUE_TYPES) {
      const key = `${seed.cca3}:${clueType}`;
      const existing = existingByKey.get(key);
      const flagUrl =
        clueType === "flag" ? getFlagUrlForCca3(seed.cca3) : null;
      const defaultFlagCandidates = flagUrl
        ? [{ image_url: flagUrl, thumb_url: flagUrl, source: "flagcdn" }]
        : [];

      await upsertSeedEntry(db, {
        cca3: seed.cca3,
        country_common: seed.common,
        clue_type: clueType,
        wiki_title: existing?.wiki_title ?? wikiTitleForSeedField(seed, clueType),
        text_content: existing?.text_content ?? textForSeedField(seed, clueType),
        status: existing?.status ?? "draft",
        image_candidates:
          existing && existing.image_candidates.length > 0
            ? existing.image_candidates
            : defaultFlagCandidates,
        selected_candidate_index: existing?.selected_candidate_index ?? 0,
        vision_pass: existing?.vision_pass ?? null,
        vision_notes: existing?.vision_notes ?? null,
        proposed_by: existing?.proposed_by ?? "seed_import",
        notes: existing?.notes ?? null,
      });
      imported++;
    }
  }
  return { imported };
}

/** Create any missing per-country clue rows (e.g. flag after an older import). */
export async function ensureMissingSeedEntries(
  db: SupabaseClient<Database>,
): Promise<{ created: number }> {
  const existingRows = await listSeedEntries(db, { limit: 5000 });
  const existingKeys = new Set(
    existingRows.map((row) => `${row.cca3}:${row.clue_type}`),
  );

  let created = 0;
  for (const seed of SEED) {
    for (const clueType of ADMIN_CLUE_TYPES) {
      const key = `${seed.cca3}:${clueType}`;
      if (existingKeys.has(key)) continue;

      const flagUrl =
        clueType === "flag" ? getFlagUrlForCca3(seed.cca3) : null;
      await upsertSeedEntry(db, {
        cca3: seed.cca3,
        country_common: seed.common,
        clue_type: clueType,
        wiki_title: wikiTitleForSeedField(seed, clueType),
        text_content: textForSeedField(seed, clueType),
        status: "draft",
        image_candidates: flagUrl
          ? [{ image_url: flagUrl, thumb_url: flagUrl, source: "flagcdn" }]
          : [],
        proposed_by: "seed_ensure",
      });
      created++;
    }
  }
  return { created };
}

/** Approve every flag seed row that already has at least one image candidate. */
export async function approveFlagsWithImages(
  db: SupabaseClient<Database>,
): Promise<{ approved: number; skipped: number }> {
  const flags = await listSeedEntries(db, { clueType: "flag", limit: 5000 });
  let approved = 0;
  let skipped = 0;

  for (const entry of flags) {
    if (entry.image_candidates.length === 0 || entry.status === "rejected") {
      skipped++;
      continue;
    }
    if (entry.status === "approved") {
      skipped++;
      continue;
    }
    await updateSeedEntry(db, entry.id, { status: "approved" });
    approved++;
  }

  return { approved, skipped };
}

function isSeedClueType(value: string): value is (typeof ADMIN_CLUE_TYPES)[number] {
  return (ADMIN_CLUE_TYPES as readonly string[]).includes(value);
}

function parsePuzzleImageCandidates(raw: unknown): ImageCandidate[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => !!item && typeof item === "object")
    .map((item) => item as Record<string, unknown>)
    .filter((item) => typeof item.image_url === "string")
    .map((item) => ({
      image_url: item.image_url as string,
      thumb_url: typeof item.thumb_url === "string" ? item.thumb_url : undefined,
      wiki_title: typeof item.label === "string" ? item.label : undefined,
      source: typeof item.source === "string" ? item.source : undefined,
      source_url: typeof item.source_url === "string" ? item.source_url : undefined,
      license: typeof item.license === "string" ? item.license : undefined,
      artist: typeof item.artist === "string" ? item.artist : undefined,
      credit: typeof item.credit === "string" ? item.credit : undefined,
    }));
}

function fallbackPuzzleImageCandidate(metadata: Record<string, unknown>): ImageCandidate[] {
  if (typeof metadata.image_url !== "string") return [];
  return [
    {
      image_url: metadata.image_url,
      thumb_url:
        typeof metadata.thumb_url === "string" ? metadata.thumb_url : metadata.image_url,
      wiki_title: typeof metadata.label === "string" ? metadata.label : undefined,
      source: typeof metadata.source === "string" ? metadata.source : undefined,
      source_url: typeof metadata.source_url === "string" ? metadata.source_url : undefined,
      license: typeof metadata.license === "string" ? metadata.license : undefined,
      artist: typeof metadata.artist === "string" ? metadata.artist : undefined,
      credit: typeof metadata.credit === "string" ? metadata.credit : undefined,
    },
  ];
}

export async function hydrateSeedEntriesFromPuzzles(
  db: SupabaseClient<Database>,
): Promise<{ hydrated: number; countries: number }> {
  const [existingRows, puzzleRows] = await Promise.all([
    listSeedEntries(db, { limit: 5000 }),
    db
      .from("ag_puzzles")
      .select("answer_id,answer,clues,updated_at,status")
      .eq("answer_type", "country")
      .in("status", ["approved", "published"])
      .order("updated_at", { ascending: false }),
  ]);

  if (puzzleRows.error) throw new Error(puzzleRows.error.message);

  const existingByKey = new Map(existingRows.map((row) => [`${row.cca3}:${row.clue_type}`, row]));
  const latestByCca3 = new Map<
    string,
    { country: string; clues: unknown[] }
  >();

  for (const row of puzzleRows.data ?? []) {
    const cca3 = row.answer_id;
    if (!cca3 || latestByCca3.has(cca3)) continue;
    latestByCca3.set(cca3, {
      country: row.answer,
      clues: Array.isArray(row.clues) ? row.clues : [],
    });
  }

  let hydrated = 0;
  for (const [cca3, payload] of latestByCca3) {
    for (const clue of payload.clues) {
      if (!clue || typeof clue !== "object") continue;
      const clueRow = clue as Record<string, unknown>;
      const clueType = typeof clueRow.type === "string" ? clueRow.type : "";
      if (!isSeedClueType(clueType)) continue;

      const content = typeof clueRow.content === "string" ? clueRow.content : null;
      const metadata =
        clueRow.metadata && typeof clueRow.metadata === "object"
          ? (clueRow.metadata as Record<string, unknown>)
          : {};

      const fromOptions = parsePuzzleImageCandidates(metadata.image_options);
      const imageCandidates =
        fromOptions.length > 0 ? fromOptions : fallbackPuzzleImageCandidate(metadata);

      const key = `${cca3}:${clueType}`;
      const existing = existingByKey.get(key);
      const mergedCandidates =
        imageCandidates.length > 0 ? imageCandidates : (existing?.image_candidates ?? []);
      const selectedCandidateIndex =
        existing && mergedCandidates.length === existing.image_candidates.length
          ? existing.selected_candidate_index
          : 0;
      const nextStatus =
        existing?.status === "approved" || existing?.status === "rejected"
          ? existing.status
          : mergedCandidates.length > 0
            ? "needs_review"
            : (existing?.status ?? "draft");

      await upsertSeedEntry(db, {
        cca3,
        country_common: existing?.country_common ?? payload.country,
        clue_type: clueType,
        wiki_title:
          clueType === "written_language"
            ? existing?.wiki_title ?? null
            : (content ?? existing?.wiki_title ?? null),
        text_content:
          clueType === "written_language"
            ? (content ?? existing?.text_content ?? null)
            : (existing?.text_content ?? null),
        status: nextStatus,
        image_candidates: mergedCandidates,
        selected_candidate_index: selectedCandidateIndex,
        vision_pass: existing?.vision_pass ?? null,
        vision_notes: existing?.vision_notes ?? null,
        proposed_by: existing?.proposed_by ?? "puzzle_hydrate",
        notes: existing?.notes ?? null,
      });
      hydrated++;
    }
  }

  return { hydrated, countries: latestByCca3.size };
}

export interface CountrySeedBundle {
  cca3: string;
  common: string;
  region: string;
  capital: string;
  entries: SeedEntryRow[];
}

/** Seed bundles for generation — any country with at least one approved clue. */
export async function loadCountrySeedBundles(
  db: SupabaseClient<Database>,
): Promise<CountrySeedBundle[]> {
  const { data, error } = await db.from("ag_seed_entries").select("*");
  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((row) => rowToSeedEntry(row as Record<string, unknown>));
  const byKey = new Map(rows.map((r) => [`${r.cca3}:${r.clue_type}`, r]));

  const bundles: CountrySeedBundle[] = [];
  for (const seed of SEED) {
    const entries: SeedEntryRow[] = [];
    for (const clueType of ADMIN_CLUE_TYPES) {
      const dbRow = byKey.get(`${seed.cca3}:${clueType}`);
      if (dbRow?.status === "approved") entries.push(dbRow);
    }
    if (entries.length === 0) continue;
    bundles.push({
      cca3: seed.cca3,
      common: seed.common,
      region: seed.region,
      capital: seed.capital,
      entries,
    });
  }
  return bundles;
}

export interface GenerationReadiness {
  totalCountries: number;
  /** Countries with at least one approved clue (eligible for generation). */
  countriesWithApprovedClues: number;
  /** Countries with all clue types approved. */
  fullyReadyCountries: number;
  /** @deprecated Use fullyReadyCountries */
  readyCountries: number;
  /** Countries missing one or more approved clues — first few for display. */
  blocked: Array<{ cca3: string; country: string; missing: string[] }>;
}

export async function getGenerationReadiness(
  db: SupabaseClient<Database>,
): Promise<GenerationReadiness> {
  const { data, error } = await db.from("ag_seed_entries").select("*");
  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((row) => rowToSeedEntry(row as Record<string, unknown>));
  const byKey = new Map(rows.map((r) => [`${r.cca3}:${r.clue_type}`, r]));

  const blocked: GenerationReadiness["blocked"] = [];
  let countriesWithApprovedClues = 0;
  let fullyReadyCountries = 0;

  for (const seed of SEED) {
    const missing: string[] = [];
    let approvedCount = 0;
    for (const clueType of ADMIN_CLUE_TYPES) {
      const dbRow = byKey.get(`${seed.cca3}:${clueType}`);
      if (!dbRow) {
        missing.push(`${clueType} (missing row)`);
      } else if (dbRow.status !== "approved") {
        missing.push(`${clueType} (${dbRow.status})`);
      } else {
        approvedCount++;
      }
    }
    if (approvedCount > 0) countriesWithApprovedClues++;
    if (missing.length === 0) {
      fullyReadyCountries++;
    } else if (blocked.length < 8) {
      blocked.push({ cca3: seed.cca3, country: seed.common, missing });
    }
  }

  return {
    totalCountries: SEED.length,
    countriesWithApprovedClues,
    fullyReadyCountries,
    readyCountries: fullyReadyCountries,
    blocked,
  };
}

export function imageAltsFor(cca3: string, clueType: string): string[] {
  const field = clueType as keyof (typeof SEED_IMAGE_ALTS)[string];
  return SEED_IMAGE_ALTS[cca3]?.[field as keyof (typeof SEED_IMAGE_ALTS)[string]] ?? [];
}

export async function listCountryAliases(
  db: SupabaseClient<Database>,
): Promise<CountryAliasRow[]> {
  const { data, error } = await db
    .from("ag_country_aliases")
    .select("*")
    .order("alias", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as CountryAliasRow[];
}

export async function upsertCountryAlias(
  db: SupabaseClient<Database>,
  cca3: string,
  alias: string,
): Promise<CountryAliasRow> {
  const { data, error } = await db
    .from("ag_country_aliases")
    .upsert({ cca3, alias: alias.trim() }, { onConflict: "alias" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as CountryAliasRow;
}

export async function deleteCountryAlias(
  db: SupabaseClient<Database>,
  id: string,
): Promise<void> {
  const { error } = await db.from("ag_country_aliases").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function seedDefaultAliases(
  db: SupabaseClient<Database>,
): Promise<{ added: number }> {
  const defaults: Array<[string, string]> = [
    ["NLD", "Holland"],
    ["NLD", "The Netherlands"],
    ["GBR", "UK"],
    ["GBR", "Britain"],
    ["GBR", "Great Britain"],
    ["USA", "America"],
    ["USA", "US"],
    ["USA", "United States of America"],
    ["KOR", "Korea"],
    ["KOR", "ROK"],
    ["KOR", "Republic of Korea"],
    ["CIV", "Ivory Coast"],
    ["CIV", "Cote d'Ivoire"],
    ["CIV", "Côte d'Ivoire"],
    ["CZE", "Czech Republic"],
    ["MMR", "Burma"],
    ["TUR", "Turkey"],
    ["TUR", "Türkiye"],
    ["VNM", "Viet Nam"],
    ["LAO", "Laos"],
    ["LAO", "Lao"],
  ];

  let added = 0;
  for (const [cca3, alias] of defaults) {
    try {
      await upsertCountryAlias(db, cca3, alias);
      added++;
    } catch {
      // ignore duplicate conflicts
    }
  }
  return { added };
}

export function buildCoverageReport(
  bundles: CountrySeedBundle[],
  puzzleGaps?: GenerateCoverageReport["gaps"],
): GenerateCoverageReport {
  const gaps: GenerateCoverageReport["gaps"] = [...(puzzleGaps ?? [])];

  for (const bundle of bundles) {
    for (const clueType of ADMIN_CLUE_TYPES) {
      const entry = bundle.entries.find((e) => e.clue_type === clueType);
      if (!entry) {
        gaps.push({
          cca3: bundle.cca3,
          country: bundle.common,
          clueType,
          issue: "missing_wiki_title",
        });
        continue;
      }
      if (entry.status === "rejected") {
        gaps.push({
          cca3: bundle.cca3,
          country: bundle.common,
          clueType,
          issue: "rejected",
          wikiTitle: entry.wiki_title,
        });
      }
      if (clueType === "written_language") {
        if (!entry.text_content?.trim()) {
          gaps.push({
            cca3: bundle.cca3,
            country: bundle.common,
            clueType,
            issue: "missing_text",
          });
        }
        continue;
      }
      if (clueType === "flag") {
        if (entry.image_candidates.length === 0) {
          gaps.push({
            cca3: bundle.cca3,
            country: bundle.common,
            clueType,
            issue: "missing_image",
          });
        }
        continue;
      }
      if (!entry.wiki_title?.trim()) {
        gaps.push({
          cca3: bundle.cca3,
          country: bundle.common,
          clueType,
          issue: "missing_wiki_title",
        });
      }
    }
  }

  return {
    totalCountries: bundles.length,
    gaps,
    missingImageCount: gaps.filter((g) => g.issue === "missing_image").length,
  };
}
