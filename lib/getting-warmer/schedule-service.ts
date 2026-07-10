import "server-only";

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

export async function getScheduledPuzzleIds(
  db: SupabaseClient<Database>,
): Promise<Set<string>> {
  const { data, error } = await db
    .from("daily_getting_warmer_puzzles")
    .select("puzzle_id");

  if (error) {
    throw new Error(`Failed to load schedule: ${error.message}`);
  }

  return new Set((data ?? []).map((row) => row.puzzle_id));
}

export async function pickNextUnscheduledApprovedPuzzleId(
  db: SupabaseClient<Database>,
): Promise<string | null> {
  const usedIds = await getScheduledPuzzleIds(db);

  const { data: approved, error } = await db
    .from("getting_warmer_puzzles")
    .select("id")
    .eq("status", "approved")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load approved puzzles: ${error.message}`);
  }

  const pick = (approved ?? []).find((puzzle) => !usedIds.has(puzzle.id));
  return pick?.id ?? null;
}

export async function scheduleDailyPuzzle(
  db: SupabaseClient<Database>,
  date?: string,
): Promise<{ puzzleId: string; date: string; alreadyScheduled: boolean } | null> {
  const targetDate = date ?? todayUtc();

  const { data: existing, error: existingError } = await db
    .from("daily_getting_warmer_puzzles")
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

  const puzzleId = await pickNextUnscheduledApprovedPuzzleId(db);
  if (!puzzleId) return null;

  const { error: insertError } = await db.from("daily_getting_warmer_puzzles").insert({
    puzzle_id: puzzleId,
    publish_date: targetDate,
  });

  if (insertError && insertError.code !== "23505") {
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
