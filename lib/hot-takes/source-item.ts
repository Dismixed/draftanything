import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ItemRow } from "./types";
import { resolveItemImageCandidates } from "./image-sourcing";
import { generateItemIcon } from "./icon-generate";
import { updateItem } from "./seed-db";

export async function sourceItemImage(
  db: SupabaseClient<Database>,
  item: ItemRow,
  categoryName: string,
  categorySlug: string,
): Promise<{ kind: "photo" | "generated" }> {
  const candidates = await resolveItemImageCandidates({
    label: item.label,
    wikiTitle: item.wiki_title,
    categoryName,
    photoQuery: item.photo_query,
  });

  if (candidates.length > 0) {
    await updateItem(db, item.id, {
      image_candidates: candidates,
      selected_candidate_index: 0,
      image_url: candidates[0]?.image_url ?? null,
      image_source: "wikimedia",
      status: "needs_review",
    });
    return { kind: "photo" };
  }

  const { publicUrl, candidate } = await generateItemIcon({
    categorySlug,
    itemSlug: item.slug,
    categoryName,
    label: item.label,
    subjectType: item.subject_type,
  });

  await updateItem(db, item.id, {
    image_candidates: [
      candidate,
      ...item.image_candidates.filter((c) => c.image_url !== publicUrl),
    ],
    selected_candidate_index: 0,
    image_url: publicUrl,
    image_source: "generated",
    status: "needs_review",
  });
  return { kind: "generated" };
}
