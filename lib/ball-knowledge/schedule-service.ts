import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { orderByLru, pickLru } from "@/lib/schedule/lru";
import { CATEGORIES } from "./categories";

export interface AutoScheduleOptions {
  startDate?: string;
}

export interface AutoScheduleEntry {
  category: string;
  publishDate: string;
}

export interface AutoScheduleResult {
  scheduled: number;
  startDate: string;
  endDate: string | null;
  entries: AutoScheduleEntry[];
}

export interface ScheduleRow {
  id: string;
  publish_date: string;
  category: string;
  created_at: string;
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

/** Map of category name → most recent publish date (or absent if never used). */
export function computeLastUsedByCategory(
  rows: Array<{ category: string; publish_date: string }>,
): Map<string, string> {
  const lastUsed = new Map<string, string>();
  for (const row of rows) {
    const prev = lastUsed.get(row.category);
    if (!prev || row.publish_date > prev) {
      lastUsed.set(row.category, row.publish_date);
    }
  }
  return lastUsed;
}

async function listScheduleRows(
  db: SupabaseClient<Database>,
): Promise<Array<{ category: string; publish_date: string }>> {
  const { data, error } = await db
    .from("ball_knowledge_schedule")
    .select("category, publish_date");

  if (error) {
    throw new Error(`Failed to load ball knowledge schedule: ${error.message}`);
  }

  return data ?? [];
}

export async function getScheduledCategory(
  db: SupabaseClient<Database>,
  date: string,
): Promise<string | null> {
  const { data, error } = await db
    .from("ball_knowledge_schedule")
    .select("category")
    .eq("publish_date", date)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load scheduled category: ${error.message}`);
  }

  return data?.category ?? null;
}

/** Pick the category used longest ago (never-used first), in CATEGORIES order. */
export async function pickLruCategory(
  db: SupabaseClient<Database>,
): Promise<string | null> {
  const rows = await listScheduleRows(db);
  const lastUsed = computeLastUsedByCategory(rows);
  return pickLru(CATEGORIES, (category) => category, lastUsed);
}

export async function scheduleDailyCategory(
  db: SupabaseClient<Database>,
  date?: string,
): Promise<{ category: string; date: string; alreadyScheduled: boolean } | null> {
  const targetDate = date ?? todayUtc();

  const existing = await getScheduledCategory(db, targetDate);
  if (existing) {
    return { category: existing, date: targetDate, alreadyScheduled: true };
  }

  const category = await pickLruCategory(db);
  if (!category) return null;

  const { error } = await db
    .from("ball_knowledge_schedule")
    .insert({ category, publish_date: targetDate });

  if (error && error.code !== "23505") {
    throw new Error(`Failed to schedule daily category: ${error.message}`);
  }

  return { category, date: targetDate, alreadyScheduled: false };
}

export async function autoScheduleCategories(
  db: SupabaseClient<Database>,
  options: AutoScheduleOptions = {},
): Promise<AutoScheduleResult> {
  const startDate = options.startDate ?? todayUtc();

  if (!isValidDate(startDate)) {
    throw new Error("startDate must be YYYY-MM-DD format");
  }

  const rows = await listScheduleRows(db);
  const occupiedDates = new Set(rows.map((row) => row.publish_date));
  const lastUsed = computeLastUsedByCategory(rows);

  const ordered = orderByLru(CATEGORIES, (category) => category, lastUsed);

  const entries: AutoScheduleEntry[] = [];
  let cursor = startDate;

  for (const category of ordered) {
    while (occupiedDates.has(cursor)) {
      cursor = addDays(cursor, 1);
    }

    entries.push({ category, publishDate: cursor });
    occupiedDates.add(cursor);
    cursor = addDays(cursor, 1);
  }

  if (entries.length > 0) {
    const { error } = await db.from("ball_knowledge_schedule").insert(
      entries.map((entry) => ({
        category: entry.category,
        publish_date: entry.publishDate,
      })),
    );

    if (error) {
      throw new Error(`Failed to create schedule entries: ${error.message}`);
    }
  }

  return {
    scheduled: entries.length,
    startDate,
    endDate: entries.length > 0 ? entries[entries.length - 1]!.publishDate : null,
    entries,
  };
}

export async function listSchedule(
  db: SupabaseClient<Database>,
): Promise<ScheduleRow[]> {
  const { data, error } = await db
    .from("ball_knowledge_schedule")
    .select("*")
    .order("publish_date", { ascending: true });

  if (error) {
    throw new Error(`Failed to list schedule: ${error.message}`);
  }

  return (data ?? []) as ScheduleRow[];
}
