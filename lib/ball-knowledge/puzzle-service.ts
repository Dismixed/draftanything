import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getDateString, getTodayCategory } from "./game-logic";
import { getScheduledCategory, scheduleDailyCategory } from "./schedule-service";

/** Per-day in-memory cache so repeated resolves (page, judge, daily API) agree. */
const dailyCache = new Map<string, string>();

/**
 * Resolve today's category from the LRU schedule, scheduling one lazily if
 * needed. Falls back to the deterministic rotation when the DB is unavailable.
 */
export async function getDailyCategory(
  db: SupabaseClient<Database>,
): Promise<string> {
  const today = getDateString();
  const cached = dailyCache.get(today);
  if (cached) return cached;

  let category: string;
  try {
    const scheduled = await getScheduledCategory(db, today);
    if (scheduled) {
      category = scheduled;
    } else {
      const result = await scheduleDailyCategory(db, today);
      category = result?.category ?? getTodayCategory();
    }
  } catch {
    category = getTodayCategory();
  }

  dailyCache.set(today, category);
  return category;
}
