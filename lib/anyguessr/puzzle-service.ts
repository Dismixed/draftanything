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
  buildDailyRoundsFromPuzzles,
  canFillDailyRounds,
  dailySessionId,
  DAILY_ROUND_COUNT,
  pickDailyPuzzles,
  scoreFromDistanceKm,
} from "./daily";
import { expandAltAnswers, resolveAliasToCca3 } from "./country-aliases";
import { getLatLngForCca3, haversineKm, resolveGuessToCca3 } from "./geo";
import { looseEqual } from "./normalize";

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
/*  Identity-shaped query cache                                        */
/* ------------------------------------------------------------------ */

const fallbackDailyCache = new Map<string, ClientDailyPuzzle>();

/* ------------------------------------------------------------------ */
/*  Fetch helpers                                                       */
/* ------------------------------------------------------------------ */

export async function getDailyPuzzle(
  db: SupabaseClient<Database>,
  date?: string,
): Promise<ClientDailyPuzzle | null> {
  const targetDate = date ?? new Date().toISOString().slice(0, 10);

  const cached = fallbackDailyCache.get(targetDate);
  if (cached) return cached;

  const { data: approved, error: apprErr } = await db
    .from("ag_puzzles")
    .select("*")
    .in("status", ["approved", "published"])
    .order("id", { ascending: true })
    .limit(500);

  if (apprErr) throw apprErr;
  if (!approved || approved.length < DAILY_ROUND_COUNT) return null;

  const rows = approved as unknown as AgPuzzleRow[];
  if (!canFillDailyRounds(rows)) return null;

  const picked = pickDailyPuzzles(rows, targetDate);

  const clientPuzzle: ClientDailyPuzzle = {
    id: dailySessionId(targetDate),
    date: targetDate,
    mode: "daily",
    answer_type: "country",
    totalRounds: DAILY_ROUND_COUNT,
    rounds: buildDailyRoundsFromPuzzles(picked, targetDate),
    difficulty: "medium",
  };
  fallbackDailyCache.set(targetDate, clientPuzzle);
  return clientPuzzle;
}

/* ------------------------------------------------------------------ */
/*  Guess validation                                                   */
/* ------------------------------------------------------------------ */

export async function validateDailyGuess(
  db: SupabaseClient<Database>,
  puzzleId: string,
  guess: string,
  roundIndex: number,
): Promise<DailyGuessResult> {
  if (roundIndex < 0 || roundIndex >= DAILY_ROUND_COUNT) {
    throw new Error("Invalid round index");
  }

  const { data: puzzle, error } = await db
    .from("ag_puzzles")
    .select("id, answer, answer_id, alt_answers, metadata, flag_url")
    .eq("id", puzzleId)
    .single();

  if (error || !puzzle) throw new Error("Puzzle not found");

  const row = puzzle as {
    answer: string;
    answer_id: string | null;
    alt_answers: string[] | null;
    metadata: Record<string, unknown> | null;
    flag_url: string | null;
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
  const completed = roundIndex >= DAILY_ROUND_COUNT - 1;

  return {
    exact,
    guess: guess.trim(),
    answer: row.answer,
    distanceKm,
    roundScore,
    completed,
    funFact: null,
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
): Promise<DailyGuessResult> {
  if (roundIndex < 0 || roundIndex >= DAILY_ROUND_COUNT) {
    throw new Error("Invalid round index");
  }

  const { data: puzzle, error } = await db
    .from("ag_puzzles")
    .select("id, answer, answer_id, alt_answers, metadata, flag_url")
    .eq("id", puzzleId)
    .single();

  if (error || !puzzle) throw new Error("Puzzle not found");

  const row = puzzle as {
    answer: string;
    answer_id: string | null;
    alt_answers: string[] | null;
    metadata: Record<string, unknown> | null;
    flag_url: string | null;
  };

  const answerCca3 = row.answer_id;
  if (!answerCca3) throw new Error("Puzzle missing country id");

  const answerCoords = getLatLngForCca3(answerCca3);
  const completed = roundIndex >= DAILY_ROUND_COUNT - 1;

  return {
    exact: false,
    guess: "",
    answer: row.answer,
    distanceKm: 20_000,
    roundScore: 0,
    completed,
    funFact:
      (row.metadata?.fun_fact as string | undefined) ?? null,
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