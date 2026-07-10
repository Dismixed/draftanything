import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { getCategory, getItem, updateItem } from "@/lib/hot-takes/seed-db";
import { resolveItemImageCandidates } from "@/lib/hot-takes/image-sourcing";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { id } = await params;
    const db = createAdminClient();
    const item = await getItem(db, id);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const category = await getCategory(db, item.category_id);
    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    const candidates = await resolveItemImageCandidates({
      label: item.label,
      wikiTitle: item.wiki_title,
      categoryName: category.name,
    });

    const updated = await updateItem(db, id, {
      image_candidates: candidates,
      selected_candidate_index: 0,
      image_url: candidates[0]?.image_url ?? null,
      image_source: candidates.length > 0 ? "wikimedia" : null,
      status: candidates.length > 0 ? "needs_review" : "needs_image",
    });

    return NextResponse.json({ item: updated, candidateCount: candidates.length });
  } catch (err) {
    console.error("hot-takes item images failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to resolve images" },
      { status: 500 },
    );
  }
}
