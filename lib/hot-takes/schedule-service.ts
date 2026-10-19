import { dailyDate } from "@/lib/daily-day";
import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { orderByLru, pickLru } from "@/lib/schedule/lru";

export interface AutoScheduleOptions {
  startDate?: string;
}

export interface AutoScheduleEntry {
  categoryId: string;
  publishDate: string;
}

export interface AutoScheduleResult {
  scheduled: number;
  skippedAlreadyScheduled: number;
  startDate: string;
  endDate: string | null;
  entries: AutoScheduleEntry[];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

interface ApprovedCategory {
  id: string;
}

interface ScheduleRow {
  category_id: string;
  publish_date: string;
}

/** Map of category id → most recent publish date (or absent if never used). */
function computeLastUsedByCategory(rows: ScheduleRow[]): Map<string, string> {
  const lastUsed = new Map<string, string>();
  for (const row of rows) {
    const prev = lastUsed.get(row.category_id);
    if (!prev || row.publish_date > prev) {
      lastUsed.set(row.category_id, row.publish_date);
    }
  }
  return lastUsed;
}

async function listApprovedCategories(
  db: SupabaseClient<Database>,
): Promise<ApprovedCategory[]> {
  const { data, error } = await db
    .from("hot_takes_categories")
    .select("id")
    .eq("status", "approved")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load approved categories: ${error.message}`);
  }

  return data ?? [];
}

async function listScheduleRows(db: SupabaseClient<Database>): Promise<ScheduleRow[]> {
  const { data, error } = await db
    .from("hot_takes_schedule")
    .select("category_id, publish_date");

  if (error) {
    throw new Error(`Failed to load schedule: ${error.message}`);
  }

  return data ?? [];
}

export async function getScheduledCategoryId(
  db: SupabaseClient<Database>,
  date: string,
): Promise<string | null> {
  const { data, error } = await db
    .from("hot_takes_schedule")
    .select("category_id")
    .eq("publish_date", date)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load scheduled category: ${error.message}`);
  }

  return data?.category_id ?? null;
}

/** Pick the approved category used longest ago (never-used first). */
export async function pickLruCategoryId(
  db: SupabaseClient<Database>,
): Promise<string | null> {
  const [approved, rows] = await Promise.all([
    listApprovedCategories(db),
    listScheduleRows(db),
  ]);

  const lastUsed = computeLastUsedByCategory(rows);
  return pickLru(approved, (category) => category.id, lastUsed)?.id ?? null;
}

export async function scheduleDailyCategory(
  db: SupabaseClient<Database>,
  date?: string,
): Promise<{ categoryId: string; date: string; alreadyScheduled: boolean } | null> {
  const targetDate = date ?? dailyDate();

  const existing = await getScheduledCategoryId(db, targetDate);
  if (existing) {
    return { categoryId: existing, date: targetDate, alreadyScheduled: true };
  }

  const categoryId = await pickLruCategoryId(db);
  if (!categoryId) return null;

  const { error } = await db
    .from("hot_takes_schedule")
    .insert({ category_id: categoryId, publish_date: targetDate });

  if (error && error.code !== "23505") {
    throw new Error(`Failed to schedule daily category: ${error.message}`);
  }

  return { categoryId, date: targetDate, alreadyScheduled: false };
}

/**
 * Assigns approved categories (ordered by least-recently-used) to consecutive
 * open dates starting at `startDate`. Categories already scheduled are not
 * reused until the whole approved pool has cycled through.
 */
export async function autoScheduleApprovedCategories(
  db: SupabaseClient<Database>,
  options: AutoScheduleOptions = {},
): Promise<AutoScheduleResult> {
  const startDate = options.startDate ?? dailyDate();

  if (!isValidDate(startDate)) {
    throw new Error("startDate must be YYYY-MM-DD format");
  }

  const [approved, rows] = await Promise.all([
    listApprovedCategories(db),
    listScheduleRows(db),
  ]);

  if (approved.length === 0) {
    return {
      scheduled: 0,
      skippedAlreadyScheduled: 0,
      startDate,
      endDate: null,
      entries: [],
    };
  }

  const occupiedDates = new Set(rows.map((row) => row.publish_date));
  const lastUsed = computeLastUsedByCategory(rows);

  const ordered = orderByLru(approved, (category) => category.id, lastUsed);

  const entries: AutoScheduleEntry[] = [];
  let cursor = startDate;

  for (const category of ordered) {
    while (occupiedDates.has(cursor)) {
      cursor = addDays(cursor, 1);
    }

    entries.push({ categoryId: category.id, publishDate: cursor });
    occupiedDates.add(cursor);
    cursor = addDays(cursor, 1);
  }

  if (entries.length > 0) {
    const { error } = await db.from("hot_takes_schedule").insert(
      entries.map((entry) => ({
        category_id: entry.categoryId,
        publish_date: entry.publishDate,
      })),
    );

    if (error) {
      throw new Error(`Failed to create schedule entries: ${error.message}`);
    }
  }

  return {
    scheduled: entries.length,
    skippedAlreadyScheduled: 0,
    startDate,
    endDate: entries.length > 0 ? entries[entries.length - 1]!.publishDate : null,
    entries,
  };
}
