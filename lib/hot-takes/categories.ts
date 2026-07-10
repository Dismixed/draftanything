import { LEGACY_CATEGORIES } from "./seed";
import type { HotTakesDailyCategory } from "./types";

/** @deprecated Use getDailyCategoryForPlay from daily-service on the server. */
export function getDailyCategoryIndex(dateStr: string, poolSize?: number): number {
  const size = poolSize ?? LEGACY_CATEGORIES.length;
  if (size <= 0) return 0;
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  return hash % size;
}

/** Sync legacy fallback for client-only previews without DB. */
export function getLegacyDailyCategory(date: Date = new Date()): HotTakesDailyCategory {
  const dateStr = date.toISOString().slice(0, 10);
  const legacy = LEGACY_CATEGORIES[getDailyCategoryIndex(dateStr)]!;
  return {
    name: legacy.name,
    items: legacy.items.map((item) => ({
      id: item.slug,
      label: item.label,
      imageUrl: `https://placehold.co/128x128/1e1e26/9a98a3?text=${encodeURIComponent(item.label.slice(0, 2))}`,
    })),
  };
}
