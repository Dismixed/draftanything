import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { getCategory, getItem, updateItem } from "@/lib/hot-takes/seed-db";
import { generateItemIcon } from "@/lib/hot-takes/icon-generate";

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

    const { publicUrl, candidate } = await generateItemIcon({
      categorySlug: category.slug,
      itemSlug: item.slug,
      categoryName: category.name,
      label: item.label,
    });

    const candidates = [candidate, ...item.image_candidates.filter((c) => c.image_url !== publicUrl)];

    const updated = await updateItem(db, id, {
      image_candidates: candidates,
      selected_candidate_index: 0,
      image_url: publicUrl,
      image_source: "generated",
      status: "needs_review",
    });

    return NextResponse.json({ item: updated });
  } catch (err) {
    console.error("hot-takes generate icon failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate icon" },
      { status: 500 },
    );
  }
}
