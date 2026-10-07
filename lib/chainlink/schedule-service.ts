import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export interface AutoScheduleOptions {
  /** First calendar day to consider (YYYY-MM-DD). Defaults to today (UTC). */
  startDate?: string;
}

export interface AutoScheduleEntry {
  puzzleId: string;
  publishDate: string;
}

export interface AutoScheduleResult {
  scheduled: number;
  skippedAlreadyScheduled: number;
  startDate: string;
  endDate: string | null;
  entries: AutoScheduleEntry[];
}

/* ------------------------------------------------------------------ */
/*  Candidate selection                                                */
/* ------------------------------------------------------------------ */

export interface ScheduleCandidate {
  id: string;
  /** Lowercased first letter of the start word ("" if unknown). */
  startLetter: string;
  difficulty: string;
  score: number;
}

/**
 * How far back to look when spacing out start letters. A candidate whose
 * start letter matches one of the last N scheduled puzzles is deprioritized.
 */
export const RECENT_LETTER_WINDOW = 3;

/**
 * Greedily picks the next candidate for a schedule slot.
 *
 * Fit score:
 *   +2 if the start letter isn't among the recent start letters
 *   +1 if the difficulty differs from the previous day's difficulty
 *
 * Callers should pass `candidates` pre-sorted by score descending so that
 * score acts as the deterministic tie-break.
 */
export function pickNextCandidate(
  candidates: ScheduleCandidate[],
  recentStartLetters: string[],
  previousDifficulty: string | null,
): ScheduleCandidate {
  const recent = new Set(recentStartLetters);
  let best = candidates[0];
  let bestFit = -Infinity;

  for (const candidate of candidates) {
    let fit = 0;
    if (!recent.has(candidate.startLetter)) fit += 2;
    if (candidate.difficulty !== previousDifficulty) fit += 1;
    if (fit > bestFit) {
      bestFit = fit;
      best = candidate;
    }
  }

  return best;
}

/* ------------------------------------------------------------------ */
/*  Date helpers                                                       */
/* ------------------------------------------------------------------ */

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function startLetterOf(words: unknown): string {
  if (!Array.isArray(words) || words.length === 0) return "";
  const first = words[0];
  return typeof first === "string" ? first.trim().charAt(0).toLowerCase() : "";
}

/* ------------------------------------------------------------------ */
/*  Auto-scheduler                                                     */
/* ------------------------------------------------------------------ */

/**
 * Assigns every approved puzzle that is not already on the daily calendar
 * to consecutive open dates starting at `startDate`, spacing out repeated
 * start letters across the week and balancing difficulty.
 */
export async function autoScheduleApprovedPuzzles(
  db: SupabaseClient<Database>,
  options: AutoScheduleOptions = {},
): Promise<AutoScheduleResult> {
  const startDate = options.startDate ?? todayUtc();

  if (!isValidDate(startDate)) {
    throw new Error("startDate must be YYYY-MM-DD format");
  }

  const { data: approved, error: approvedError } = await db
    .from("chain_puzzles")
    .select("id, words, difficulty, score")
    .eq("status", "approved")
    .order("score", { ascending: false });

  if (approvedError) {
    throw new Error(`Failed to load approved puzzles: ${approvedError.message}`);
  }

  if (!approved || approved.length === 0) {
    return {
      scheduled: 0,
      skippedAlreadyScheduled: 0,
      startDate,
      endDate: null,
      entries: [],
    };
  }

  const { data: existingSchedules, error: scheduleError } = await db
    .from("daily_chain_puzzles")
    .select("puzzle_id, publish_date");

  if (scheduleError) {
    throw new Error(`Failed to load schedule: ${scheduleError.message}`);
  }

  const occupiedDates = new Set(
    (existingSchedules ?? []).map((row) => row.publish_date),
  );
  const alreadyScheduledPuzzleIds = new Set(
    (existingSchedules ?? []).map((row) => row.puzzle_id),
  );

  // Convert to selectable candidates, pre-sorted by score desc so score
  // acts as the deterministic tie-break in pickNextCandidate.
  const candidates: ScheduleCandidate[] = approved
    .filter((puzzle) => !alreadyScheduledPuzzleIds.has(puzzle.id))
    .map((puzzle) => ({
      id: puzzle.id,
      startLetter: startLetterOf(puzzle.words),
      difficulty: puzzle.difficulty,
      score: puzzle.score,
    }));

  const skippedAlreadyScheduled = approved.length - candidates.length;

  if (candidates.length === 0) {
    return {
      scheduled: 0,
      skippedAlreadyScheduled,
      startDate,
      endDate: null,
      entries: [],
    };
  }

  const entries: AutoScheduleEntry[] = [];
  const remaining = [...candidates];
  const recentStartLetters: string[] = [];
  let previousDifficulty: string | null = null;
  let cursor = startDate;

  while (remaining.length > 0) {
    while (occupiedDates.has(cursor)) {
      cursor = addDays(cursor, 1);
    }

    const pick = pickNextCandidate(remaining, recentStartLetters, previousDifficulty);
    const pickIndex = remaining.findIndex((c) => c.id === pick.id);
    remaining.splice(pickIndex, 1);

    entries.push({ puzzleId: pick.id, publishDate: cursor });

    recentStartLetters.push(pick.startLetter);
    if (recentStartLetters.length > RECENT_LETTER_WINDOW) {
      recentStartLetters.shift();
    }
    previousDifficulty = pick.difficulty;

    occupiedDates.add(cursor);
    cursor = addDays(cursor, 1);
  }

  const { error: insertError } = await db.from("daily_chain_puzzles").insert(
    entries.map((entry) => ({
      puzzle_id: entry.puzzleId,
      publish_date: entry.publishDate,
    })),
  );

  if (insertError) {
    throw new Error(`Failed to create schedule entries: ${insertError.message}`);
  }

  const puzzleIds = entries.map((entry) => entry.puzzleId);
  const { error: updateError } = await db
    .from("chain_puzzles")
    .update({
      status: "scheduled",
      updated_at: new Date().toISOString(),
    })
    .in("id", puzzleIds);

  if (updateError) {
    throw new Error(`Failed to update puzzle statuses: ${updateError.message}`);
  }

  return {
    scheduled: entries.length,
    skippedAlreadyScheduled,
    startDate: entries[0]?.publishDate ?? startDate,
    endDate: entries[entries.length - 1]?.publishDate ?? null,
    entries,
  };
}

/* ------------------------------------------------------------------ */
/*  Lazy scheduler                                                     */
/* ------------------------------------------------------------------ */

/**
 * Puts the best-fitting approved puzzle on the calendar for `date`, so a day
 * nobody scheduled still gets reviewed content before anything is generated.
 *
 * Returns true when `date` now has a puzzle (ours, or a concurrent
 * request's), false when no approved puzzle was available.
 */
export async function scheduleNextApprovedPuzzle(
  db: SupabaseClient<Database>,
  date: string,
): Promise<boolean> {
  const { data: approved, error: approvedError } = await db
    .from("chain_puzzles")
    .select("id, words, difficulty, score")
    .eq("status", "approved")
    .order("score", { ascending: false });
  if (approvedError) {
    throw new Error(`Failed to load approved puzzles: ${approvedError.message}`);
  }

  const { data: schedule, error: scheduleError } = await db
    .from("daily_chain_puzzles")
    .select("puzzle_id, publish_date");
  if (scheduleError) {
    throw new Error(`Failed to load schedule: ${scheduleError.message}`);
  }

  const scheduledIds = new Set((schedule ?? []).map((row) => row.puzzle_id));
  const candidates: ScheduleCandidate[] = (approved ?? [])
    .filter((puzzle) => !scheduledIds.has(puzzle.id))
    .map((puzzle) => ({
      id: puzzle.id,
      startLetter: startLetterOf(puzzle.words),
      difficulty: puzzle.difficulty,
      score: puzzle.score,
    }));
  if (candidates.length === 0) return false;

  // The dailies just before `date`, oldest first, for letter and difficulty spacing.
  const recentIds = (schedule ?? [])
    .filter((row) => row.publish_date < date)
    .sort((a, b) => (a.publish_date < b.publish_date ? 1 : -1))
    .slice(0, RECENT_LETTER_WINDOW)
    .map((row) => row.puzzle_id)
    .reverse();

  let recentStartLetters: string[] = [];
  let previousDifficulty: string | null = null;
  if (recentIds.length > 0) {
    const { data: recent, error: recentError } = await db
      .from("chain_puzzles")
      .select("id, words, difficulty")
      .in("id", recentIds);
    if (recentError) {
      throw new Error(`Failed to load recent puzzles: ${recentError.message}`);
    }
    const byId = new Map((recent ?? []).map((puzzle) => [puzzle.id, puzzle]));
    recentStartLetters = recentIds.map((id) => startLetterOf(byId.get(id)?.words));
    previousDifficulty = byId.get(recentIds[recentIds.length - 1])?.difficulty ?? null;
  }

  const pick = pickNextCandidate(candidates, recentStartLetters, previousDifficulty);

  const { error: insertError } = await db
    .from("daily_chain_puzzles")
    .insert({ publish_date: date, puzzle_id: pick.id });
  // Lost a race: another request already claimed the date. Theirs stands.
  if (insertError?.code === "23505") return true;
  if (insertError) {
    throw new Error(`Failed to schedule puzzle: ${insertError.message}`);
  }

  const { error: updateError } = await db
    .from("chain_puzzles")
    .update({ status: "scheduled", updated_at: new Date().toISOString() })
    .eq("id", pick.id);
  if (updateError) {
    throw new Error(`Failed to update puzzle status: ${updateError.message}`);
  }

  return true;
}
