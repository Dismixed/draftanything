import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { LEGACY_CATEGORIES } from "./seed";
import { slugify } from "./slugify";
import {
  HOT_TAKES_ITEM_COUNT,
  type CategoryRow,
  type CategoryStatus,
  type CategoryWithItems,
  type ImageCandidate,
  type ImageSource,
  type ItemRow,
  type ItemStatus,
  type ScheduleRow,
} from "./types";

function parseCandidates(raw: unknown): ImageCandidate[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is ImageCandidate =>
      !!item &&
      typeof item === "object" &&
      typeof (item as ImageCandidate).image_url === "string",
  );
}

function rowToCategory(row: Record<string, unknown>): CategoryRow {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    status: row.status as CategoryStatus,
    cover_image_url: (row.cover_image_url as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    proposed_by: (row.proposed_by as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function rowToItem(row: Record<string, unknown>): ItemRow {
  return {
    id: row.id as string,
    category_id: row.category_id as string,
    slug: row.slug as string,
    label: row.label as string,
    sort_order: (row.sort_order as number) ?? 0,
    wiki_title: (row.wiki_title as string | null) ?? null,
    image_url: (row.image_url as string | null) ?? null,
    image_candidates: parseCandidates(row.image_candidates),
    selected_candidate_index: (row.selected_candidate_index as number) ?? 0,
    image_source: (row.image_source as ImageSource | null) ?? null,
    status: row.status as ItemStatus,
    notes: (row.notes as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function selectedImageUrl(item: ItemRow): string | null {
  if (item.image_url) return item.image_url;
  const candidate = item.image_candidates[item.selected_candidate_index];
  return candidate?.image_url ?? null;
}

export function categoryReadyForApproval(category: CategoryWithItems): {
  ready: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  if (category.items.length !== HOT_TAKES_ITEM_COUNT) {
    issues.push(`Need ${HOT_TAKES_ITEM_COUNT} items (have ${category.items.length})`);
  }
  for (const item of category.items) {
    if (!selectedImageUrl(item)) {
      issues.push(`Missing image: ${item.label}`);
    } else if (item.status !== "approved") {
      issues.push(`Item not approved: ${item.label}`);
    }
  }
  return { ready: issues.length === 0, issues };
}

export async function listCategories(
  db: SupabaseClient<Database>,
  filters?: { status?: string; limit?: number },
): Promise<CategoryRow[]> {
  let query = db
    .from("hot_takes_categories")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(filters?.limit ?? 500);

  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => rowToCategory(row as Record<string, unknown>));
}

export async function getCategory(
  db: SupabaseClient<Database>,
  id: string,
): Promise<CategoryWithItems | null> {
  const { data: category, error } = await db
    .from("hot_takes_categories")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!category) return null;

  const { data: items, error: itemsError } = await db
    .from("hot_takes_items")
    .select("*")
    .eq("category_id", id)
    .order("sort_order", { ascending: true });
  if (itemsError) throw new Error(itemsError.message);

  return {
    ...rowToCategory(category as Record<string, unknown>),
    items: (items ?? []).map((row) => rowToItem(row as Record<string, unknown>)),
  };
}

export async function createCategory(
  db: SupabaseClient<Database>,
  input: { name: string; notes?: string | null; proposed_by?: string | null },
): Promise<CategoryRow> {
  const slug = slugify(input.name);
  const { data, error } = await db
    .from("hot_takes_categories")
    .insert({
      name: input.name.trim(),
      slug,
      notes: input.notes ?? null,
      proposed_by: input.proposed_by ?? "manual",
      status: "draft",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToCategory(data as Record<string, unknown>);
}

export async function updateCategory(
  db: SupabaseClient<Database>,
  id: string,
  patch: Partial<{
    name: string;
    status: CategoryStatus;
    cover_image_url: string | null;
    notes: string | null;
  }>,
): Promise<CategoryRow> {
  const { data, error } = await db
    .from("hot_takes_categories")
    .update({
      ...patch,
      slug: patch.name ? slugify(patch.name) : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToCategory(data as Record<string, unknown>);
}

export async function replaceCategoryItems(
  db: SupabaseClient<Database>,
  categoryId: string,
  items: Array<{
    slug: string;
    label: string;
    wiki_title?: string | null;
    notes?: string | null;
  }>,
): Promise<ItemRow[]> {
  if (items.length !== HOT_TAKES_ITEM_COUNT) {
    throw new Error(`Must provide exactly ${HOT_TAKES_ITEM_COUNT} items`);
  }

  const { error: deleteError } = await db
    .from("hot_takes_items")
    .delete()
    .eq("category_id", categoryId);
  if (deleteError) throw new Error(deleteError.message);

  const rows = items.map((item, index) => ({
    category_id: categoryId,
    slug: item.slug,
    label: item.label,
    wiki_title: item.wiki_title ?? null,
    notes: item.notes ?? null,
    sort_order: index + 1,
    status: "needs_image" as const,
  }));

  const { data, error } = await db
    .from("hot_takes_items")
    .insert(rows)
    .select("*");

  if (error) throw new Error(error.message);

  await updateCategory(db, categoryId, { status: "needs_items" });

  return (data ?? []).map((row) => rowToItem(row as Record<string, unknown>));
}

export async function getItem(
  db: SupabaseClient<Database>,
  id: string,
): Promise<ItemRow | null> {
  const { data, error } = await db
    .from("hot_takes_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return rowToItem(data as Record<string, unknown>);
}

export async function updateItem(
  db: SupabaseClient<Database>,
  id: string,
  patch: Partial<{
    label: string;
    slug: string;
    wiki_title: string | null;
    sort_order: number;
    image_url: string | null;
    image_candidates: ImageCandidate[];
    selected_candidate_index: number;
    image_source: ImageSource | null;
    status: ItemStatus;
    notes: string | null;
  }>,
): Promise<ItemRow> {
  const { data, error } = await db
    .from("hot_takes_items")
    .update({
      ...patch,
      image_candidates: patch.image_candidates as unknown as Json | undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return rowToItem(data as Record<string, unknown>);
}

export async function importLegacySeed(
  db: SupabaseClient<Database>,
): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;

  for (const legacy of LEGACY_CATEGORIES) {
    const slug = slugify(legacy.name);
    const { data: existing } = await db
      .from("hot_takes_categories")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    const category = await createCategory(db, {
      name: legacy.name,
      proposed_by: "legacy-import",
    });

    await replaceCategoryItems(
      db,
      category.id,
      legacy.items.map((item) => ({
        slug: item.slug,
        label: item.label,
        wiki_title: item.wiki_title,
      })),
    );

    imported++;
  }

  return { imported, skipped };
}

export async function listSchedule(
  db: SupabaseClient<Database>,
  options?: { from?: string; limit?: number },
): Promise<ScheduleRow[]> {
  let query = db
    .from("hot_takes_schedule")
    .select("*")
    .order("publish_date", { ascending: true })
    .limit(options?.limit ?? 120);

  if (options?.from) query = query.gte("publish_date", options.from);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    publish_date: row.publish_date as string,
    category_id: row.category_id as string,
    created_at: row.created_at as string,
  }));
}

export async function scheduleCategory(
  db: SupabaseClient<Database>,
  categoryId: string,
  publishDate: string,
): Promise<ScheduleRow> {
  const category = await getCategory(db, categoryId);
  if (!category) throw new Error("Category not found");
  if (category.status !== "approved") {
    throw new Error("Only approved categories can be scheduled");
  }

  const { data: existing } = await db
    .from("hot_takes_schedule")
    .select("id")
    .eq("publish_date", publishDate)
    .maybeSingle();

  if (existing) {
    throw new Error("A category is already scheduled for this date");
  }

  const { data, error } = await db
    .from("hot_takes_schedule")
    .insert({ category_id: categoryId, publish_date: publishDate })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id,
    publish_date: data.publish_date,
    category_id: data.category_id,
    created_at: data.created_at,
  };
}

export async function getApprovedCategoryPool(
  db: SupabaseClient<Database>,
): Promise<CategoryRow[]> {
  const { data, error } = await db
    .from("hot_takes_categories")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => rowToCategory(row as Record<string, unknown>));
}

export async function getCategoryForPlay(
  db: SupabaseClient<Database>,
  categoryId: string,
): Promise<CategoryWithItems | null> {
  const category = await getCategory(db, categoryId);
  if (!category) return null;

  const playableItems = category.items
    .filter((item) => item.status === "approved" && selectedImageUrl(item))
    .sort((a, b) => a.sort_order - b.sort_order);

  if (playableItems.length !== HOT_TAKES_ITEM_COUNT) return null;

  return { ...category, items: playableItems };
}

export { selectedImageUrl };
