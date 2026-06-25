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

/**
 * Assigns every approved puzzle that is not already on the daily calendar
 * to consecutive open dates starting at `startDate`.
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
    .select("id")
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

  const puzzlesToSchedule = approved.filter(
    (puzzle) => !alreadyScheduledPuzzleIds.has(puzzle.id),
  );
  const skippedAlreadyScheduled =
    approved.length - puzzlesToSchedule.length;

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
