import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { LEGACY_CATEGORIES } from "./seed";
import {
  getApprovedCategoryPool,
  getCategoryForPlay,
} from "./seed-db";
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

  if (scheduled?.category_id) {
    const category = await getCategoryForPlay(db, scheduled.category_id);
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

  const pool = await getApprovedCategoryPool(db);
  if (pool.length > 0) {
    const pick = pool[getDailyCategoryIndex(dateStr, pool.length)]!;
    const category = await getCategoryForPlay(db, pick.id);
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
