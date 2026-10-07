import "server-only";
import { pickLru } from "@/lib/schedule/lru";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

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
    .from("freezeframes_puzzles")
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
    .from("daily_freezeframes_puzzles")
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

  const { error: insertError } = await db.from("daily_freezeframes_puzzles").insert(
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

interface PuzzleUsage {
  /** Approved puzzle ids, oldest first. */
  approved: { id: string }[];
  /** Puzzle id → the most recent date it ran. */
  lastUsed: Map<string, string>;
}

async function loadPuzzleUsage(db: SupabaseClient<Database>): Promise<PuzzleUsage> {
  const { data: schedule, error: scheduleError } = await db
    .from("daily_freezeframes_puzzles")
    .select("puzzle_id, publish_date");
  if (scheduleError) {
    throw new Error(`Failed to load schedule: ${scheduleError.message}`);
  }

  const { data: approved, error } = await db
    .from("freezeframes_puzzles")
    .select("id")
    .eq("status", "approved")
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error(`Failed to load approved puzzles: ${error.message}`);
  }

  const lastUsed = new Map<string, string>();
  for (const row of schedule ?? []) {
    const previous = lastUsed.get(row.puzzle_id);
    if (!previous || row.publish_date > previous) lastUsed.set(row.puzzle_id, row.publish_date);
  }

  return { approved: approved ?? [], lastUsed };
}

/**
 * The next puzzle to schedule: one that has never run if any is left,
 * otherwise the one that ran longest ago. Recycling means an empty queue
 * loops through old puzzles instead of repeating a single fallback.
 */
export async function pickNextPuzzleId(db: SupabaseClient<Database>): Promise<string | null> {
  const { approved, lastUsed } = await loadPuzzleUsage(db);
  return pickLru(approved, (puzzle) => puzzle.id, lastUsed)?.id ?? null;
}

/** How many approved puzzles have never run: the days left before recycling starts. */
export async function countUnscheduledApproved(db: SupabaseClient<Database>): Promise<number> {
  const { approved, lastUsed } = await loadPuzzleUsage(db);
  return approved.filter((puzzle) => !lastUsed.has(puzzle.id)).length;
}

export async function scheduleDailyPuzzle(
  db: SupabaseClient<Database>,
  date?: string,
): Promise<{ puzzleId: string; date: string; alreadyScheduled: boolean } | null> {
  const targetDate = date ?? todayUtc();

  const { data: existing, error: existingError } = await db
    .from("daily_freezeframes_puzzles")
    .select("puzzle_id")
    .eq("publish_date", targetDate)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to load daily schedule: ${existingError.message}`);
  }

  if (existing) {
    return {
      puzzleId: existing.puzzle_id,
      date: targetDate,
      alreadyScheduled: true,
    };
  }

  const puzzleId = await pickNextPuzzleId(db);
  if (!puzzleId) return null;

  const { error: insertError } = await db.from("daily_freezeframes_puzzles").insert({
    puzzle_id: puzzleId,
    publish_date: targetDate,
  });

  if (insertError && insertError.code !== "23505") {
    throw new Error(`Failed to schedule daily puzzle: ${insertError.message}`);
  }

  return { puzzleId, date: targetDate, alreadyScheduled: false };
}
