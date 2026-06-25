/**
 * AnyGuessr online generator.
 *
 * Pipeline:
 *   1. Fetch country metadata from REST Countries (cached per process).
 *   2. For each seed entry, resolve the curated Wikipedia page titles
 *      (environment / person / food / landmark) into Commons image URLs via
 *      the Wikipedia REST `page/summary` endpoint, which returns a thumbnail
 *      + original image URL pair per article.
 *   3. Assemble a Clue[] in difficulty order (hardest → easiest) and persist
 *      via the puzzle-service.
 *
 * If external APIs are unreachable, the generator falls back to writing the
 * seed as fixtures with no media (the written-language clue still makes the
 * puzzle solvable).
 */
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { AnswerType, Clue } from "./types";
import { SEED, type SeedEntry } from "./seed";
import { upsertPuzzleByAnswer } from "./puzzle-service";

export interface GenerateResult {
  cca3: string;
  country: string;
  puzzleId: string;
  clues: number;
  ok: boolean;
  error?: string;
}

export interface GenerateAllResult {
  total: number;
  succeeded: number;
  failed: number;
  results: GenerateResult[];
}

/* ------------------------------------------------------------------ */
/*  REST Countries                                                     */
/* ------------------------------------------------------------------ */

const REST_COUNTRIES_ALL_URL =
  "https://restcountries.com/v3.1/all?fields=cca3,name,region,flags,altSpellings,demonyms,languages";

interface RestCountry {
  cca3: string;
  name: { common: string; official: string };
  region: string;
  flags: { png?: string; svg?: string; alt?: string };
  altSpellings?: string[];
  languages?: Record<string, string>;
}

let restCountriesCache: RestCountry[] | null = null;

async function fetchRestCountries(): Promise<RestCountry[]> {
  if (restCountriesCache) return restCountriesCache;
  try {
    const res = await fetch(REST_COUNTRIES_ALL_URL, {
      headers: { Accept: "application/json" },
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

/* ------------------------------------------------------------------ */
/*  Wikipedia REST page/summary                                        */
/* ------------------------------------------------------------------ */

interface WikiSummary {
  title: string;
  thumbnail?: { source: string; width: number; height: number };
  originalimage?: { source: string; width: number; height: number };
  content_urls?: { page: string };
  extract?: string;
}

async function fetchWikiSummary(title: string): Promise<WikiSummary | null> {
  const url =
    "https://en.wikipedia.org/api/rest_v1/page/summary/" +
    encodeURIComponent(title.replace(/ /g, "_"));
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Stim-Labs-AnyGuessr/1.0 (https://stimlabs.games)",
      },
      next: { revalidate: 604_800 },
    });
    if (!res.ok) return null;
    return (await res.json()) as WikiSummary;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Clue assembly                                                      */
/* ------------------------------------------------------------------ */

function buildImageClue(
  type: string,
  wiki: WikiSummary | null,
  difficultyRank: number,
  fallbackTitle: string,
): Clue {
  const image = wiki?.originalimage?.source ?? wiki?.thumbnail?.source;
  const thumb = wiki?.thumbnail?.source ?? image;
  return {
    type,
    content: fallbackTitle, // alt-text fallback — never displayed to player
    difficulty_rank: difficultyRank,
    metadata: {
      image_url: image,
      thumb_url: thumb,
      alt_text: `${type} clue photo`,
      source: wiki?.title,
      source_url: wiki?.content_urls?.page,
      hide_label: true,
      label: fallbackTitle,
    },
  };
}

function buildTextClue(
  type: string,
  text: string,
  difficultyRank: number,
): Clue {
  return {
    type,
    content: text,
    difficulty_rank: difficultyRank,
    metadata: { alt_text: `${type} clue`, hide_label: false },
  };
}

/* ------------------------------------------------------------------ */
/*  One country → one puzzle                                           */
/* ------------------------------------------------------------------ */

export async function generatePuzzleForCountry(
  db: SupabaseClient<Database>,
  seed: SeedEntry,
  restCountries: RestCountry[],
): Promise<GenerateResult> {
  const meta = restCountries.find((c) => c.cca3 === seed.cca3);

  const [env, person, food, landmark] = await Promise.all([
    fetchWikiSummary(seed.environment),
    fetchWikiSummary(seed.person),
    fetchWikiSummary(seed.food),
    fetchWikiSummary(seed.landmark),
  ]);

  const clues: Clue[] = [
    buildImageClue("environment", env, 1, seed.environment),
    buildImageClue("person", person, 2, seed.person),
    buildImageClue("food", food, 3, seed.food),
    buildTextClue("written_language", seed.written_language, 4),
    buildImageClue("landmark", landmark, 5, seed.landmark),
  ];

  const funFact =
    !!env?.extract && env.extract.length > 40
      ? env.extract.split(".")[0] + "."
      : `${seed.common} is part of the ${seed.region} region.`;

  const alt = meta?.altSpellings ?? [];
  const altNormalised = Array.from(
    new Set(
      [meta?.name.common, meta?.name.official, ...alt].filter(
        (v): v is string => !!v,
      ),
    ),
  );

  try {
    const puzzleId = await upsertPuzzleByAnswer(db, {
      answer_type: "country" as AnswerType,
      answer: seed.common,
      answer_id: seed.cca3,
      alt_answers: altNormalised,
      region: meta?.region ?? seed.region,
      flag_url: meta?.flags?.png ?? meta?.flags?.svg,
      clues,
      difficulty: "medium",
      metadata: {
        capital: seed.capital,
        languages: meta?.languages,
        fun_fact: funFact,
      },
      created_by: "generator",
    });

    return { cca3: seed.cca3, country: seed.common, puzzleId, clues: clues.length, ok: true };
  } catch (err) {
    return {
      cca3: seed.cca3,
      country: seed.common,
      puzzleId: "",
      clues: clues.length,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/* ------------------------------------------------------------------ */
/*  All-seed orchestration                                             */
/* ------------------------------------------------------------------ */

export async function generateAll(
  db: SupabaseClient<Database>,
  options?: { limit?: number },
): Promise<GenerateAllResult> {
  const rest = await fetchRestCountries();
  const entries: SeedEntry[] = options?.limit
    ? SEED.slice(0, options.limit)
    : SEED;

  const results: GenerateResult[] = [];
  for (const entry of entries) {
    const r = await generatePuzzleForCountry(db, entry, rest);
    results.push(r);
  }

  const succeeded = results.filter((r) => r.ok).length;
  return {
    total: entries.length,
    succeeded,
    failed: entries.length - succeeded,
    results,
  };
}

/* ------------------------------------------------------------------ */
/*  Daily scheduler                                                    */
/* ------------------------------------------------------------------ */

/**
 * Pick a puzzle for the given date (or today) and schedule it as daily.
 * Selection is deterministic from a date-derived FNV-1a hash so every
 * caller on the same UTC date picks the same country; the same hash helper
 * lives in puzzle-service.ts so the fallback path stays consistent.
 */
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

/** Deterministic FNV-1a 32-bit hash of a string. Same helper lives in puzzle-service.ts. */
function dateHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}