import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

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

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function autoScheduleApprovedCategories(
  db: SupabaseClient<Database>,
  options: AutoScheduleOptions = {},
): Promise<AutoScheduleResult> {
  const startDate = options.startDate ?? todayUtc();

  const { data: approved, error: approvedError } = await db
    .from("hot_takes_categories")
    .select("id")
    .eq("status", "approved")
    .order("created_at", { ascending: true });

  if (approvedError) {
    throw new Error(`Failed to load approved categories: ${approvedError.message}`);
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

  const { data: existing, error: existingError } = await db
    .from("hot_takes_schedule")
    .select("publish_date")
    .gte("publish_date", startDate)
    .order("publish_date", { ascending: true });

  if (existingError) {
    throw new Error(`Failed to load schedule: ${existingError.message}`);
  }

  const taken = new Set((existing ?? []).map((row) => row.publish_date as string));
  const entries: AutoScheduleEntry[] = [];
  let cursor = startDate;
  let categoryIdx = 0;

  while (categoryIdx < approved.length) {
    while (taken.has(cursor)) {
      cursor = addDays(cursor, 1);
    }

    const categoryId = approved[categoryIdx]!.id as string;
    const { error: insertError } = await db.from("hot_takes_schedule").insert({
      category_id: categoryId,
      publish_date: cursor,
    });

    if (insertError) {
      throw new Error(`Failed to schedule ${cursor}: ${insertError.message}`);
    }

    entries.push({ categoryId, publishDate: cursor });
    taken.add(cursor);
    categoryIdx++;
    cursor = addDays(cursor, 1);
  }

  return {
    scheduled: entries.length,
    skippedAlreadyScheduled: taken.size - entries.length,
    startDate,
    endDate: entries.length > 0 ? entries[entries.length - 1]!.publishDate : null,
    entries,
  };
}
