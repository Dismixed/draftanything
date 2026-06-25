import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type {
  AnswerType,
  ClientClue,
  ClientPuzzle,
  Clue,
  GuessResult,
  Puzzle,
} from "./types";

/* ------------------------------------------------------------------ */
/*  Row shape returned by Supabase                                     */
/* ------------------------------------------------------------------ */

interface AgPuzzleRow {
  id: string;
  answer_type: AnswerType;
  answer: string;
  answer_id: string | null;
  alt_answers: string[] | null;
  region: string | null;
  flag_url: string | null;
  clues: Clue[];
  difficulty: string | null;
  metadata: Record<string, unknown> | null;
  status: string;
}

function toClient(puzzle: AgPuzzleRow, mode: "daily" | "infinite", date?: string): ClientPuzzle {
  // Strip the answer before sending to client — the player must earn it.
  // `content` is the alt-text fallback; we redact it from the client payload
  // when the clue carries `hide_label: true` so the country name is never leaked.
  const clues: ClientClue[] = (puzzle.clues ?? []).map((c) => {
    const hideLabel = c.metadata?.hide_label === true;
    return {
      type: c.type,
      content: hideLabel ? "" : c.content,
      metadata: {
        ...c.metadata,
        // Don't leak the Wikipedia page title (which sometimes contains a country name).
        source: hideLabel ? undefined : c.metadata?.source,
        source_url: hideLabel ? undefined : c.metadata?.source_url,
        label: hideLabel ? undefined : c.metadata?.label,
        // Drop persisted flag so the renderer doesn't have to learn about it.
        hide_label: undefined,
      },
      difficulty_rank: c.difficulty_rank,
    };
  });

  return {
    id: puzzle.id,
    date,
    mode,
    answer_type: puzzle.answer_type,
    region: puzzle.region ?? undefined,
    flag_url: puzzle.flag_url ?? undefined,
    clues,
    difficulty: puzzle.difficulty ?? undefined,
  };
}

/* ------------------------------------------------------------------ */
/*  Insert / upsert                                                    */
/* ------------------------------------------------------------------ */

export interface UpsertPuzzleInput {
  answer_type: AnswerType;
  answer: string;
  answer_id?: string;
  alt_answers?: string[];
  region?: string;
  flag_url?: string;
  clues: Clue[];
  difficulty?: string;
  metadata?: Record<string, unknown>;
  created_by?: string;
}

export async function upsertPuzzleByAnswer(
  db: SupabaseClient<Database>,
  input: UpsertPuzzleInput,
): Promise<string> {
  const { data: existing } = await db
    .from("ag_puzzles")
    .select("id")
    .eq("answer_type", input.answer_type)
    .eq("answer", input.answer)
    .maybeSingle();

  if (existing) {
    const { error } = await db
      .from("ag_puzzles")
      .update({
        answer_id: input.answer_id,
        alt_answers: (input.alt_answers ?? []) as unknown as Json,
        region: input.region,
        flag_url: input.flag_url,
        clues: input.clues as unknown as Json,
        difficulty: input.difficulty ?? "medium",
        metadata: (input.metadata ?? {}) as unknown as Json,
        status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw new Error(`upsert update failed: ${error.message}`);
    return existing.id;
  }

  const { data, error } = await db
    .from("ag_puzzles")
    .insert({
      answer_type: input.answer_type,
      answer: input.answer,
      answer_id: input.answer_id,
      alt_answers: (input.alt_answers ?? []) as unknown as Json,
      region: input.region,
      flag_url: input.flag_url,
      clues: input.clues as unknown as Json,
      difficulty: input.difficulty ?? "medium",
      metadata: (input.metadata ?? {}) as unknown as Json,
      status: "approved",
      created_by: input.created_by ?? "generator",
    })
    .select("id")
    .single();

  if (error) throw new Error(`upsert insert failed: ${error.message}`);
  return data.id;
}

/* ------------------------------------------------------------------ */
/*  Identity-shaped query cache                                        */
/* ------------------------------------------------------------------ */

const fallbackDailyCache = new Map<string, ClientPuzzle>();

/* ------------------------------------------------------------------ */
/*  Fetch helpers                                                       */
/* ------------------------------------------------------------------ */

export async function getDailyPuzzle(
  db: SupabaseClient<Database>,
  date?: string,
): Promise<ClientPuzzle | null> {
  const targetDate = date ?? new Date().toISOString().slice(0, 10);

  const cached = fallbackDailyCache.get(targetDate);
  if (cached) return cached;

  const { data: scheduled, error: schedError } = await db
    .from("daily_ag_puzzles")
    .select("puzzle_id, publish_date")
    .eq("publish_date", targetDate)
    .maybeSingle();

  if (schedError) throw schedError;

  const puzzleId = scheduled?.puzzle_id;
  let puzzle: AgPuzzleRow | null = null;

  if (puzzleId) {
    const { data, error } = await db
      .from("ag_puzzles")
      .select("*")
      .eq("id", puzzleId)
      .single();
    if (error) throw error;
    puzzle = data as unknown as AgPuzzleRow;
  } else {
    // Fallback: deterministic pick from approved puzzles (same UTC date → same country).
    const { data: approved, error: apprErr } = await db
      .from("ag_puzzles")
      .select("*")
      .in("status", ["approved", "published"])
      .order("id", { ascending: true })
      .limit(500);
    if (apprErr) throw apprErr;
    if (!approved || approved.length === 0) return null;
    const idx = dateStringHash(targetDate) % approved.length;
    puzzle = approved[idx] as unknown as AgPuzzleRow;
  }

  if (!puzzle) return null;
  const clientPuzzle = toClient(puzzle, "daily", targetDate);
  fallbackDailyCache.set(targetDate, clientPuzzle);
  return clientPuzzle;
}

export async function getRandomApprovedPuzzle(
  db: SupabaseClient<Database>,
  options?: { excludeIds?: string[] },
): Promise<ClientPuzzle | null> {
  let puzzles = await queryApprovedPuzzles(db, options?.excludeIds);

  // If the player has recently seen every puzzle in the pool, wrap around instead
  // of returning 404 (common during dev when only a handful are seeded).
  if (puzzles.length === 0 && options?.excludeIds?.length) {
    puzzles = await queryApprovedPuzzles(db);
  }

  if (puzzles.length === 0) return null;

  const pick = puzzles[Math.floor(Math.random() * puzzles.length)] as unknown as AgPuzzleRow;
  return toClient(pick, "infinite");
}

async function queryApprovedPuzzles(
  db: SupabaseClient<Database>,
  excludeIds?: string[],
): Promise<AgPuzzleRow[]> {
  let query = db
    .from("ag_puzzles")
    .select("*")
    .in("status", ["approved", "published"])
    .limit(500);

  if (excludeIds && excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }

  const { data: puzzles, error } = await query;
  if (error) throw error;
  return (puzzles ?? []) as unknown as AgPuzzleRow[];
}

/* ------------------------------------------------------------------ */
/*  Guess validation                                                   */
/* ------------------------------------------------------------------ */

/**
 * Normalize an answer string for fuzzy comparison.
 *  - lowercase
 *  - strip diacritics
 *  - collapse non-letter/digit runs to single spaces
 *  - trim
 *
 * "United States" / "united states" / "United States of America " → "united states"
 */
export function normalizeAnswer(input: string): string {
  return (input ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Compare a player guess against the canonical answer + alt_answers.
 * Matches canonical name OR any alt form, normalized.
 * The "the" / "kingdom of" / "republic of" prefixes are stripped on both sides
 * so "Republic of Ireland" matches "Ireland" when both routes expose it.
 */
const STRIP_PREFIXES = [
  "the ",
  "kingdom of ",
  "republic of ",
  "united states of ",
  "federated states of ",
  "state of ",
];

function looseEqual(guess: string, candidate: string): boolean {
  const g = normalizeAnswer(guess);
  const c = normalizeAnswer(candidate);
  if (!g || !c) return false;
  if (g === c) return true;

  const strip = (s: string): string => {
    for (const p of STRIP_PREFIXES) {
      if (s.startsWith(p)) return s.slice(p.length);
    }
    return s;
  };
  return strip(g) === strip(c);
}

interface PuzzleAnswerRow {
  id: string;
  answer_type: AnswerType;
  answer: string;
  alt_answers: string[] | null;
  metadata: Record<string, unknown> | null;
  clues: Clue[];
}

export async function validateGuess(
  db: SupabaseClient<Database>,
  puzzleId: string,
  guess: string,
): Promise<GuessResult> {
  const { data: puzzle, error } = await db
    .from("ag_puzzles")
    .select("id, answer_type, answer, alt_answers, metadata, clues")
    .eq("id", puzzleId)
    .single();

  if (error || !puzzle) throw new Error("Puzzle not found");

  const row = puzzle as unknown as PuzzleAnswerRow;
  const correct =
    looseEqual(guess, row.answer) ||
    (row.alt_answers ?? []).some((a) => looseEqual(guess, a));

  if (!correct) {
    // Wrong-guess reveal logic is purely client-side: the client knows how many
    // clues it has revealed and the total clue count; auto-reveal = next index.
    return {
      correct: false,
      autoReveal: false,
      revealIndex: null,
      completed: false,
      normalizedAnswer: null,
      funFact: null,
    };
  }

  return {
    correct: true,
    autoReveal: false,
    revealIndex: null,
    completed: true,
    normalizedAnswer: row.answer,
    funFact:
      (row.metadata?.fun_fact as string | undefined) ?? null,
  };
}

/**
 * Server-side surrender: returns the answer + fun fact for the results screen
 * without requiring a correct guess.
 */
export async function revealAnswer(
  db: SupabaseClient<Database>,
  puzzleId: string,
): Promise<{ answer: string; altAnswers: string[]; funFact: string | null }> {
  const { data: puzzle, error } = await db
    .from("ag_puzzles")
    .select("answer, alt_answers, metadata")
    .eq("id", puzzleId)
    .single();

  if (error || !puzzle) throw new Error("Puzzle not found");

  return {
    answer: puzzle.answer as string,
    altAnswers: (puzzle.alt_answers as string[] | null) ?? [],
    funFact:
      (puzzle.metadata as Record<string, unknown> | null)?.fun_fact as
        | string
        | undefined ?? null,
  };
}

/* ------------------------------------------------------------------ */
/*  Fun-fact accessor (results screen)                                 */
/* ------------------------------------------------------------------ */

export async function getFunFact(
  db: SupabaseClient<Database>,
  puzzleId: string,
): Promise<string | null> {
  const { data, error } = await db
    .from("ag_puzzles")
    .select("metadata")
    .eq("id", puzzleId)
    .single();
  if (error) return null;
  return (data.metadata as Record<string, unknown> | null)?.fun_fact as string | undefined ?? null;
}

/* ------------------------------------------------------------------ */
/*  Hash helper (deterministic by date)                                */
/* ------------------------------------------------------------------ */

function dateStringHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/* ------------------------------------------------------------------ */
/*  Public type export (used by component store)                       */
/* ------------------------------------------------------------------ */

export type { Puzzle };