import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type {
  AnswerType,
  ClientDailyPuzzle,
  Clue,
  DailyGuessResult,
  Puzzle,
} from "./types";
import {
  buildDailyRound,
  dailySessionId,
  isDailyCluePlayable,
  MAX_DAILY_ROUNDS,
  scoreFromDistanceKm,
} from "./daily";
import { LINEUP_ROUNDS, pickLineup, type LineupClue, type LineupDay, type LineupDifficulty } from "./lineup";
import { expandAltAnswers, resolveAliasToCca3 } from "./country-aliases";
import { getLatLngForCca3, haversineKm, resolveGuessToCca3 } from "./geo";
import { looseEqual } from "./normalize";
import { funFactForClue, type ClueFunFact, type FunFactSource } from "./fun-fact";

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
/*  Daily lineup                                                       */
/* ------------------------------------------------------------------ */

async function loadStoredLineup(
  db: SupabaseClient<Database>,
  date: string,
): Promise<ClientDailyPuzzle | null> {
  const { data, error } = await db
    .from("ag_daily_lineups")
    .select("puzzle")
    .eq("play_date", date)
    .maybeSingle();
  if (error) throw error;
  return data ? (data.puzzle as unknown as ClientDailyPuzzle) : null;
}

/** How far back stored lineups are read when avoiding repeats. */
const RECENT_LINEUP_DAYS = 30;

const DIFFICULTIES: readonly string[] = ["easy", "medium", "hard"];

/** Every playable clue in the approved puzzles, one puzzle per country. */
function cluePool(rows: AgPuzzleRow[]): LineupClue[] {
  const pool: LineupClue[] = [];
  for (const row of rows) {
    for (const clue of row.clues ?? []) {
      if (!isDailyCluePlayable(clue.type, clue)) continue;
      const rated = clue.metadata?.difficulty;
      pool.push({
        puzzleId: row.id,
        clueType: clue.type,
        // A flag opens every game as an easy round; anything unrated is treated as medium.
        difficulty:
          clue.type === "flag"
            ? "easy"
            : typeof rated === "string" && DIFFICULTIES.includes(rated)
              ? (rated as LineupDifficulty)
              : "medium",
      });
    }
  }
  return pool;
}

/** What the days before `date` actually showed, from the stored lineups. */
async function loadRecentLineups(db: SupabaseClient<Database>, date: string): Promise<LineupDay[]> {
  const since = new Date(`${date}T12:00:00Z`);
  since.setUTCDate(since.getUTCDate() - RECENT_LINEUP_DAYS);

  const { data, error } = await db
    .from("ag_daily_lineups")
    .select("play_date, puzzle")
    .gte("play_date", since.toISOString().slice(0, 10))
    .lt("play_date", date);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    date: row.play_date,
    rounds: (row.puzzle as unknown as ClientDailyPuzzle).rounds ?? [],
  }));
}

/**
 * The daily for `date`. The first caller computes the lineup from the
 * approved pool and stores it; every later caller gets the stored copy, so
 * approving or changing clues never alters a day that already exists.
 */
export async function getDailyPuzzle(
  db: SupabaseClient<Database>,
  date?: string,
): Promise<ClientDailyPuzzle | null> {
  const targetDate = date ?? new Date().toISOString().slice(0, 10);

  const stored = await loadStoredLineup(db, targetDate);
  if (stored) return stored;

  const { data: approved, error: apprErr } = await db
    .from("ag_puzzles")
    .select("*")
    .in("status", ["approved", "published"])
    .order("id", { ascending: true })
    .limit(500);

  if (apprErr) throw apprErr;
  const rows = (approved ?? []) as unknown as AgPuzzleRow[];

  const picked = pickLineup(cluePool(rows), targetDate, await loadRecentLineups(db, targetDate));
  if (!picked) return null;

  const byId = new Map(rows.map((row) => [row.id, row]));
  const clientPuzzle: ClientDailyPuzzle = {
    id: dailySessionId(targetDate),
    date: targetDate,
    mode: "daily",
    answer_type: "country",
    totalRounds: picked.length,
    rounds: picked.map((clue, roundIndex) =>
      buildDailyRound(byId.get(clue.puzzleId)!, clue.clueType, roundIndex, targetDate),
    ),
    difficulty: "medium",
  };

  const { error: insertError } = await db
    .from("ag_daily_lineups")
    .insert({ play_date: targetDate, puzzle: clientPuzzle as unknown as Json });
  // Another request stored the date first; everyone gets theirs.
  if (insertError?.code === "23505") {
    const winner = await loadStoredLineup(db, targetDate);
    if (winner) return winner;
  }
  if (insertError) throw insertError;

  return clientPuzzle;
}

/* ------------------------------------------------------------------ */
/*  Guess validation                                                   */
/* ------------------------------------------------------------------ */

/**
 * The reviewed fact about the clue the player just saw, or null. A fact is garnish, so a failed
 * lookup must never fail the guess.
 */
async function loadClueFunFact(
  db: SupabaseClient<Database>,
  cca3: string,
  clueType: string | undefined,
  clues: unknown,
): Promise<ClueFunFact | null> {
  if (!clueType || !Array.isArray(clues)) return null;
  const clue = (clues as Clue[]).find((c) => c.type === clueType);
  if (!clue) return null;

  const { data } = await db
    .from("ag_seed_entries")
    .select("clue_type, wiki_title, text_content, fun_fact, fun_fact_source_url, fun_fact_reviewed")
    .eq("cca3", cca3)
    .eq("clue_type", clueType)
    .eq("fun_fact_reviewed", true)
    .maybeSingle();

  return funFactForClue(data as FunFactSource | null, clue);
}

function factFields(fact: ClueFunFact | null): Pick<DailyGuessResult, "funFact" | "funFactSource"> {
  return { funFact: fact?.text ?? null, funFactSource: fact?.sourceUrl ?? null };
}

export async function validateDailyGuess(
  db: SupabaseClient<Database>,
  puzzleId: string,
  guess: string,
  roundIndex: number,
  clueType?: string,
): Promise<DailyGuessResult> {
  if (roundIndex < 0 || roundIndex >= MAX_DAILY_ROUNDS) {
    throw new Error("Invalid round index");
  }

  const { data: puzzle, error } = await db
    .from("ag_puzzles")
    .select("id, answer, answer_id, alt_answers, metadata, flag_url, clues")
    .eq("id", puzzleId)
    .single();

  if (error || !puzzle) throw new Error("Puzzle not found");

  const row = puzzle as {
    answer: string;
    answer_id: string | null;
    alt_answers: string[] | null;
    metadata: Record<string, unknown> | null;
    flag_url: string | null;
    clues: unknown;
  };

  const answerCca3 = row.answer_id;
  if (!answerCca3) throw new Error("Puzzle missing country id");

  const guessCca3 =
    resolveGuessToCca3(guess) ?? (await resolveAliasToCca3(db, guess));

  const exact =
    guessCca3 === answerCca3 ||
    looseEqual(guess, row.answer) ||
    (row.alt_answers ?? []).some((a) => looseEqual(guess, a));

  const answerCoords = getLatLngForCca3(answerCca3);
  const guessCoords = guessCca3 ? getLatLngForCca3(guessCca3) : null;

  const distanceKm =
    !guessCca3 || !answerCoords
      ? 20_000
      : guessCca3 === answerCca3
        ? 0
        : guessCoords
          ? haversineKm(guessCoords, answerCoords)
          : 20_000;

  const roundScore = scoreFromDistanceKm(distanceKm);
  const completed = roundIndex >= LINEUP_ROUNDS - 1;

  return {
    exact,
    guess: guess.trim(),
    answer: row.answer,
    distanceKm,
    roundScore,
    completed,
    ...factFields(await loadClueFunFact(db, answerCca3, clueType, row.clues)),
    flagUrl: row.flag_url,
    answerLat: answerCoords?.[0] ?? 0,
    answerLng: answerCoords?.[1] ?? 0,
    guessLat: guessCoords?.[0] ?? null,
    guessLng: guessCoords?.[1] ?? null,
    answerCca3,
    guessCca3,
  };
}

export async function revealDailyRound(
  db: SupabaseClient<Database>,
  puzzleId: string,
  roundIndex: number,
  clueType?: string,
): Promise<DailyGuessResult> {
  if (roundIndex < 0 || roundIndex >= MAX_DAILY_ROUNDS) {
    throw new Error("Invalid round index");
  }

  const { data: puzzle, error } = await db
    .from("ag_puzzles")
    .select("id, answer, answer_id, alt_answers, metadata, flag_url, clues")
    .eq("id", puzzleId)
    .single();

  if (error || !puzzle) throw new Error("Puzzle not found");

  const row = puzzle as {
    answer: string;
    answer_id: string | null;
    alt_answers: string[] | null;
    metadata: Record<string, unknown> | null;
    flag_url: string | null;
    clues: unknown;
  };

  const answerCca3 = row.answer_id;
  if (!answerCca3) throw new Error("Puzzle missing country id");

  const answerCoords = getLatLngForCca3(answerCca3);
  const completed = roundIndex >= LINEUP_ROUNDS - 1;

  return {
    exact: false,
    guess: "",
    answer: row.answer,
    distanceKm: 20_000,
    roundScore: 0,
    completed,
    ...factFields(await loadClueFunFact(db, answerCca3, clueType, row.clues)),
    flagUrl: row.flag_url,
    answerLat: answerCoords?.[0] ?? 0,
    answerLng: answerCoords?.[1] ?? 0,
    guessLat: null,
    guessLng: null,
    answerCca3,
    guessCca3: null,
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
/*  Public type export (used by component store)                       */
/* ------------------------------------------------------------------ */

export type { Puzzle };