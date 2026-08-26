import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { getCategory, getItem } from "@/lib/hot-takes/seed-db";
import { sourceItemImage } from "@/lib/hot-takes/source-item";

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

    const { kind } = await sourceItemImage(db, item, category.name, category.slug);

    const refreshedItem = await getItem(db, id);
    if (!refreshedItem) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      item: refreshedItem,
      kind,
      candidateCount: refreshedItem.image_candidates.length,
    });
  } catch (err) {
    console.error("hot-takes item source failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to source image" },
      { status: 500 },
    );
  }
}
