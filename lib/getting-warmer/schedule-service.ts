import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { pickLru } from "@/lib/schedule/lru";

export interface AutoScheduleOptions {
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

export async function autoScheduleApprovedPuzzles(
  db: SupabaseClient<Database>,
  options: AutoScheduleOptions = {},
): Promise<AutoScheduleResult> {
  const startDate = options.startDate ?? todayUtc();

  if (!isValidDate(startDate)) {
    throw new Error("startDate must be YYYY-MM-DD format");
  }

  const { data: approved, error: approvedError } = await db
    .from("getting_warmer_puzzles")
    .select("id")
    .eq("status", "approved")
    .order("created_at", { ascending: true });

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
    .from("daily_getting_warmer_puzzles")
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

  const puzzlesToSchedule = approved.filter(
    (puzzle) => !alreadyScheduledPuzzleIds.has(puzzle.id),
  );
  const skippedAlreadyScheduled = approved.length - puzzlesToSchedule.length;

  if (puzzlesToSchedule.length === 0) {
    return {
      scheduled: 0,
      skippedAlreadyScheduled,
      startDate,
      endDate: null,
      entries: [],
    };
  }

  const entries: AutoScheduleEntry[] = [];
  let cursor = startDate;

  for (const puzzle of puzzlesToSchedule) {
    while (occupiedDates.has(cursor)) {
      cursor = addDays(cursor, 1);
    }

    entries.push({ puzzleId: puzzle.id, publishDate: cursor });
    occupiedDates.add(cursor);
    cursor = addDays(cursor, 1);
  }

  const { error: insertError } = await db.from("daily_getting_warmer_puzzles").insert(
    entries.map((entry) => ({
      puzzle_id: entry.puzzleId,
      publish_date: entry.publishDate,
    })),
  );

  if (insertError) {
    throw new Error(`Failed to create schedule entries: ${insertError.message}`);
  }

  return {
    scheduled: entries.length,
    skippedAlreadyScheduled,
    startDate: entries[0]?.publishDate ?? startDate,
    endDate: entries[entries.length - 1]?.publishDate ?? null,
    entries,
  };
}

interface ScheduleRow {
  puzzle_id: string;
  publish_date: string;
}

/** Rows fetched per request; a single response stops at 1000. */
const HISTORY_PAGE_SIZE = 1000;

/**
 * Every schedule row, oldest first. Paged so that a long-running schedule
 * cannot silently drop rows from the least-recently-used calculation.
 */
async function loadScheduleHistory(db: SupabaseClient<Database>): Promise<ScheduleRow[]> {
  const rows: ScheduleRow[] = [];
  for (let from = 0; ; from += HISTORY_PAGE_SIZE) {
    const { data, error } = await db
      .from("daily_getting_warmer_puzzles")
      .select("puzzle_id, publish_date")
      .order("publish_date", { ascending: true })
      .range(from, from + HISTORY_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to load schedule: ${error.message}`);
    }
    rows.push(...(data ?? []));
    if (!data || data.length < HISTORY_PAGE_SIZE) return rows;
  }
}

/** Approved puzzle ids, oldest first. */
async function loadApprovedIds(db: SupabaseClient<Database>): Promise<{ id: string }[]> {
  const { data, error } = await db
    .from("getting_warmer_puzzles")
    .select("id")
    .eq("status", "approved")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load approved puzzles: ${error.message}`);
  }
  return data ?? [];
}

/**
 * The puzzle to schedule for `targetDate`: one that has never run if any is
 * left, otherwise the one that ran longest ago. Only assignments before
 * `targetDate` count as use, so a future-dated row does not hide a puzzle
 * from an earlier date.
 */
export async function pickNextApprovedPuzzleId(
  db: SupabaseClient<Database>,
  targetDate: string,
): Promise<string | null> {
  const [approved, history] = await Promise.all([loadApprovedIds(db), loadScheduleHistory(db)]);

  const lastUsed = new Map<string, string>();
  for (const row of history) {
    if (row.publish_date >= targetDate) continue;
    const previous = lastUsed.get(row.puzzle_id);
    if (!previous || row.publish_date > previous) lastUsed.set(row.puzzle_id, row.publish_date);
  }

  return pickLru(approved, (puzzle) => puzzle.id, lastUsed)?.id ?? null;
}

/**
 * How many approved puzzles have not run on or before `date`: the days of
 * fresh content left before recycling starts.
 */
export async function countUnusedApproved(
  db: SupabaseClient<Database>,
  date: string = todayUtc(),
): Promise<number> {
  const [approved, history] = await Promise.all([loadApprovedIds(db), loadScheduleHistory(db)]);
  const used = new Set(history.filter((row) => row.publish_date <= date).map((row) => row.puzzle_id));
  return approved.filter((puzzle) => !used.has(puzzle.id)).length;
}

async function loadAssignment(db: SupabaseClient<Database>, date: string): Promise<string | null> {
  const { data, error } = await db
    .from("daily_getting_warmer_puzzles")
    .select("puzzle_id")
    .eq("publish_date", date)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load daily schedule: ${error.message}`);
  }
  return data?.puzzle_id ?? null;
}

export async function scheduleDailyPuzzle(
  db: SupabaseClient<Database>,
  date?: string,
): Promise<{ puzzleId: string; date: string; alreadyScheduled: boolean } | null> {
  const targetDate = date ?? todayUtc();

  const existing = await loadAssignment(db, targetDate);
  if (existing) {
    return { puzzleId: existing, date: targetDate, alreadyScheduled: true };
  }

  const puzzleId = await pickNextApprovedPuzzleId(db, targetDate);
  if (!puzzleId) return null;

  const { error: insertError } = await db.from("daily_getting_warmer_puzzles").insert({
    puzzle_id: puzzleId,
    publish_date: targetDate,
  });

  // Another request claimed the date first. Return what it stored, never our
  // own candidate: the caller caches the answer for the day.
  if (insertError?.code === "23505") {
    const winner = await loadAssignment(db, targetDate);
    if (winner) return { puzzleId: winner, date: targetDate, alreadyScheduled: true };
  }
  if (insertError) {
    throw new Error(`Failed to schedule daily puzzle: ${insertError.message}`);
  }

  return { puzzleId, date: targetDate, alreadyScheduled: false };
}

export async function listSchedule(
  db: SupabaseClient<Database>,
): Promise<{ puzzle_id: string; publish_date: string }[]> {
  const { data, error } = await db
    .from("daily_getting_warmer_puzzles")
    .select("puzzle_id, publish_date")
    .order("publish_date", { ascending: true });

  if (error) {
    throw new Error(`Failed to load schedule: ${error.message}`);
  }

  return data ?? [];
}
