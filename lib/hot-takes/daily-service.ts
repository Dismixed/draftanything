import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { LEGACY_CATEGORIES } from "./seed";
import { getCategoryForPlay } from "./seed-db";
import { scheduleDailyCategory } from "./schedule-service";
import { getDailyCategoryIndex } from "./categories";
import type { HotTakesDailyCategory } from "./types";

function legacyFallback(dateStr: string): HotTakesDailyCategory {
  const index = getDailyCategoryIndex(dateStr, LEGACY_CATEGORIES.length);
  const legacy = LEGACY_CATEGORIES[index]!;
  return {
    name: legacy.name,
    items: legacy.items.map((item) => ({
      id: item.slug,
      label: item.label,
      imageUrl: `https://placehold.co/128x128/1e1e26/9a98a3?text=${encodeURIComponent(item.label.slice(0, 2))}`,
    })),
  };
}

export async function getDailyCategoryForPlay(
  db: SupabaseClient<Database>,
  date: Date = new Date(),
): Promise<HotTakesDailyCategory> {
  const dateStr = date.toISOString().slice(0, 10);

  const { data: scheduled, error: scheduleError } = await db
    .from("hot_takes_schedule")
    .select("category_id")
    .eq("publish_date", dateStr)
    .maybeSingle();

  if (scheduleError) {
    console.error("hot-takes schedule lookup failed:", scheduleError.message);
    return legacyFallback(dateStr);
  }

  let categoryId = scheduled?.category_id ?? null;

  // No explicit schedule yet — assign one lazily using the LRU rotation.
  if (!categoryId) {
    const result = await scheduleDailyCategory(db, dateStr);
    categoryId = result?.categoryId ?? null;
  }

  if (categoryId) {
    const category = await getCategoryForPlay(db, categoryId);
    if (category) {
      return {
        name: category.name,
        items: category.items.map((item) => ({
          id: item.slug,
          label: item.label,
          imageUrl: item.image_url ?? item.image_candidates[item.selected_candidate_index]?.image_url ?? "",
        })),
      };
    }
  }

  return legacyFallback(dateStr);
}
