/**
 * AnyGuessr online generator.
 *
 * Pipeline:
 *   1. Load approved seed entries from ag_seed_entries (fallback: seed.ts).
 *   2. Fetch country metadata from REST Countries (cached, retry/backoff).
 *   3. Resolve image candidates (DB-stored or Wikipedia + Commons search).
 *   4. Assemble Clue[] and persist via puzzle-service.
 */
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fetchWithRetry } from "./async-pool";
import { expandAltAnswers } from "./country-aliases";
import { resolveImageCandidates, resolveTitlesToCandidates } from "./image-sourcing";
import {
  buildCoverageReport,
  getGenerationReadiness,
  imageAltsFor,
  loadCountrySeedBundles,
  type CountrySeedBundle,
  type GenerationReadiness,
} from "./seed-db";
import type { GenerateCoverageReport, ImageCandidate, SeedEntryRow } from "./seed-types";
import type { AnswerType, Clue, ClueImageOption } from "./types";
import { upsertPuzzleByAnswer } from "./puzzle-service";

export interface GenerateResult {
  cca3: string;
  country: string;
  puzzleId: string;
  clues: number;
  ok: boolean;
  error?: string;
  gaps?: GenerateCoverageReport["gaps"];
}

export interface GenerateAllResult {
  total: number;
  succeeded: number;
  failed: number;
  results: GenerateResult[];
  coverage: GenerateCoverageReport;
  readiness: GenerationReadiness;
}

const REST_COUNTRIES_ALL_URL =
  "https://restcountries.com/v3.1/all?fields=cca3,name,region,altSpellings,demonyms,languages,currencies";

interface RestCurrency {
  name: string;
  symbol?: string;
}

interface RestCountry {
  cca3: string;
  name: { common: string; official: string };
  region: string;
  altSpellings?: string[];
  languages?: Record<string, string>;
  currencies?: Record<string, RestCurrency>;
}

let restCountriesCache: RestCountry[] | null = null;

async function fetchRestCountries(): Promise<RestCountry[]> {
  if (restCountriesCache) return restCountriesCache;
  try {
    const res = await fetchWithRetry(REST_COUNTRIES_ALL_URL, {
      next: { revalidate: 86_400 },
    });
    if (!res.ok) throw new Error(`REST Countries ${res.status}`);
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) throw new Error("REST Countries returned non-array payload");
    restCountriesCache = data as RestCountry[];
  } catch {
    restCountriesCache = [];
  }
  return restCountriesCache;
}

function candidatesToOptions(
  candidates: ImageCandidate[],
  label: string,
): ClueImageOption[] {
  return candidates.map((c) => ({
    image_url: c.image_url,
    thumb_url: c.thumb_url ?? c.image_url,
    source: c.source,
    source_url: c.source_url,
    label,
    license: c.license,
    artist: c.artist,
    credit: c.credit,
  }));
}

function buildImageClue(
  type: string,
  label: string,
  candidates: ImageCandidate[],
  difficultyRank: number,
): Clue {
  const options = candidatesToOptions(candidates, label);
  const primary = options[0];
  return {
    type,
    content: label,
    difficulty_rank: difficultyRank,
    metadata: {
      image_url: primary?.image_url,
      thumb_url: primary?.thumb_url,
      alt_text: `${type} clue photo`,
      source: primary?.source,
      source_url: primary?.source_url,
      hide_label: true,
      label,
      image_options: options,
      license: primary?.license,
      artist: primary?.artist,
      credit: primary?.credit,
    },
  };
}

function buildTextClue(type: string, text: string, difficultyRank: number): Clue {
  return {
    type,
    content: text,
    difficulty_rank: difficultyRank,
    metadata: { alt_text: `${type} clue`, hide_label: false },
  };
}

function currencyTextFromMeta(meta: RestCountry | undefined): string {
  const entries = Object.entries(meta?.currencies ?? {});
  if (entries.length === 0) return "?";
  const [code, info] = entries[0];
  return info.symbol?.trim() || info.name?.trim() || code;
}

async function candidatesForEntry(
  bundle: CountrySeedBundle,
  entry: SeedEntryRow,
): Promise<ImageCandidate[]> {
  if (entry.image_candidates.length > 0) {
    const idx = Math.min(
      entry.selected_candidate_index,
      entry.image_candidates.length - 1,
    );
    const selected = entry.image_candidates[idx];
    const rest = entry.image_candidates.filter((_, i) => i !== idx);
    return [selected, ...rest].filter(Boolean);
  }

  const extras = imageAltsFor(bundle.cca3, entry.clue_type);
  const titles = Array.from(
    new Set([entry.wiki_title, ...extras].filter((t): t is string => !!t)),
  );

  if (titles.length > 0) {
    const fromTitles = await resolveTitlesToCandidates(entry.clue_type, titles);
    if (fromTitles.length > 0) return fromTitles;
  }

  return resolveImageCandidates({
    clueType: entry.clue_type,
    country: bundle.common,
    wikiTitle: entry.wiki_title,
    extraTitles: extras,
  });
}

async function buildClueForEntry(
  bundle: CountrySeedBundle,
  entry: SeedEntryRow,
  meta: RestCountry | undefined,
  rank: number,
): Promise<{ clue: Clue; gap?: GenerateCoverageReport["gaps"][number] }> {
  if (entry.clue_type === "written_language") {
    const text = entry.text_content?.trim() ?? "";
    return { clue: buildTextClue("written_language", text, rank) };
  }

  const label =
    entry.clue_type === "flag"
      ? "national flag"
      : (entry.wiki_title ?? entry.clue_type);
  const candidates = await candidatesForEntry(bundle, entry);
  if (candidates.length === 0) {
    if (entry.clue_type === "currency") {
      return {
        clue: buildTextClue("currency", currencyTextFromMeta(meta), rank),
      };
    }
    return {
      clue: buildImageClue(entry.clue_type, label, [], rank),
      gap: {
        cca3: bundle.cca3,
        country: bundle.common,
        clueType: entry.clue_type,
        issue: "missing_image",
        wikiTitle: entry.wiki_title,
      },
    };
  }

  return { clue: buildImageClue(entry.clue_type, label, candidates, rank) };
}

const CLUE_RANKS: Record<string, number> = {
  flag: 1,
  currency: 2,
  jersey: 3,
  brand: 4,
  environment: 5,
  person: 6,
  food: 7,
  written_language: 8,
  landmark: 9,
};

export async function generatePuzzleForBundle(
  db: SupabaseClient<Database>,
  bundle: CountrySeedBundle,
  restCountries: RestCountry[],
): Promise<GenerateResult> {
  const meta = restCountries.find((c) => c.cca3 === bundle.cca3);
  const gaps: GenerateCoverageReport["gaps"] = [];
  const clues: Clue[] = [];

  for (const entry of [...bundle.entries].sort(
    (a, b) => (CLUE_RANKS[a.clue_type] ?? 99) - (CLUE_RANKS[b.clue_type] ?? 99),
  )) {
    const rank = CLUE_RANKS[entry.clue_type] ?? 5;
    const built = await buildClueForEntry(bundle, entry, meta, rank);
    clues.push(built.clue);
    if (built.gap) gaps.push(built.gap);
  }

  const flagClue = clues.find((c) => c.type === "flag");
  const flagImage =
    flagClue?.metadata?.image_url ?? flagClue?.metadata?.thumb_url ?? null;

  const env = clues.find((c) => c.type === "environment");
  const funFact =
    env?.metadata?.source && typeof env.metadata.source === "string"
      ? `${bundle.common} is home to sights like ${env.metadata.source}.`
      : `${bundle.common} is part of the ${bundle.region} region.`;

  const altBase = Array.from(
    new Set(
      [meta?.name.common, meta?.name.official, ...(meta?.altSpellings ?? [])].filter(
        (v): v is string => !!v,
      ),
    ),
  );
  const altNormalised = await expandAltAnswers(db, bundle.cca3, altBase);

  try {
    const puzzleId = await upsertPuzzleByAnswer(db, {
      answer_type: "country" as AnswerType,
      answer: bundle.common,
      answer_id: bundle.cca3,
      alt_answers: altNormalised,
      region: meta?.region ?? bundle.region,
      flag_url: flagImage,
      clues,
      difficulty: "medium",
      metadata: {
        capital: bundle.capital,
        languages: meta?.languages,
        fun_fact: funFact,
      },
      created_by: "generator",
    });

    return {
      cca3: bundle.cca3,
      country: bundle.common,
      puzzleId,
      clues: clues.length,
      ok: true,
      gaps,
    };
  } catch (err) {
    return {
      cca3: bundle.cca3,
      country: bundle.common,
      puzzleId: "",
      clues: clues.length,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      gaps,
    };
  }
}

export async function generateAll(
  db: SupabaseClient<Database>,
  options?: { limit?: number },
): Promise<GenerateAllResult> {
  const rest = await fetchRestCountries();
  const readiness = await getGenerationReadiness(db);
  const bundles = await loadCountrySeedBundles(db);
  const slice = options?.limit ? bundles.slice(0, options.limit) : bundles;

  const results: GenerateResult[] = [];
  const puzzleGaps: GenerateCoverageReport["gaps"] = [];

  for (const bundle of slice) {
    const r = await generatePuzzleForBundle(db, bundle, rest);
    results.push(r);
    if (r.gaps) puzzleGaps.push(...r.gaps);
  }

  const succeeded = results.filter((r) => r.ok).length;
  const coverage = buildCoverageReport(slice, puzzleGaps);

  return {
    total: slice.length,
    succeeded,
    failed: slice.length - succeeded,
    results,
    coverage,
    readiness,
  };
}

export async function scheduleDailyPuzzle(
  db: SupabaseClient<Database>,
  date?: string,
): Promise<{ puzzleId: string; date: string; alreadyScheduled: boolean } | null> {
  const targetDate = date ?? new Date().toISOString().slice(0, 10);

  const existing = await db
    .from("daily_ag_puzzles")
    .select("puzzle_id")
    .eq("publish_date", targetDate)
    .maybeSingle();

  if (existing.data) {
    return {
      puzzleId: existing.data.puzzle_id as string,
      date: targetDate,
      alreadyScheduled: true,
    };
  }

  const { data: approved, error } = await db
    .from("ag_puzzles")
    .select("id")
    .in("status", ["approved", "published"])
    .order("id", { ascending: true })
    .limit(500);

  if (error) throw new Error(`failed to load approved: ${error.message}`);
  if (!approved || approved.length === 0) return null;

  const seed = dateHash(targetDate);
  const pick = approved[seed % approved.length];

  const { error: insErr } = await db
    .from("daily_ag_puzzles")
    .insert({ publish_date: targetDate, puzzle_id: pick.id });

  if (insErr && insErr.code !== "23505") {
    throw new Error(`failed to schedule daily puzzle: ${insErr.message}`);
  }

  return { puzzleId: pick.id as string, date: targetDate, alreadyScheduled: false };
}

function dateHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
