export const HOT_TAKES_ITEM_COUNT = 15;

export const CATEGORY_STATUSES = [
  "draft",
  "needs_items",
  "needs_review",
  "approved",
  "rejected",
  "used",
] as const;

export type CategoryStatus = (typeof CATEGORY_STATUSES)[number];

export const ITEM_STATUSES = [
  "draft",
  "needs_image",
  "needs_review",
  "approved",
  "rejected",
] as const;

export type ItemStatus = (typeof ITEM_STATUSES)[number];

export const IMAGE_SOURCES = ["wikimedia", "manual", "generated"] as const;
export type ImageSource = (typeof IMAGE_SOURCES)[number];

export interface ImageCandidate {
  image_url: string;
  thumb_url?: string;
  wiki_title?: string;
  source?: string;
  source_url?: string;
  license?: string;
  artist?: string;
  credit?: string;
}

/** Player-facing daily payload */
export interface HotTakesDailyCategory {
  name: string;
  items: HotTakesDailyItem[];
}

export interface HotTakesDailyItem {
  id: string;
  label: string;
  imageUrl: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  status: CategoryStatus;
  cover_image_url: string | null;
  notes: string | null;
  proposed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItemRow {
  id: string;
  category_id: string;
  slug: string;
  label: string;
  sort_order: number;
  wiki_title: string | null;
  image_url: string | null;
  image_candidates: ImageCandidate[];
  selected_candidate_index: number;
  image_source: ImageSource | null;
  status: ItemStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryWithItems extends CategoryRow {
  items: ItemRow[];
}

export interface ScheduleRow {
  id: string;
  publish_date: string;
  category_id: string;
  created_at: string;
}
