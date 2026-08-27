import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { getCategory, selectedImageUrl } from "@/lib/hot-takes/seed-db";
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
    const category = await getCategory(db, id);
    if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const results: Array<{ itemId: string; slug: string; kind: string }> = [];
    let skipped = 0;

    for (const item of category.items) {
      if (selectedImageUrl(item)) {
        skipped += 1;
        results.push({ itemId: item.id, slug: item.slug, kind: "skipped" });
        continue;
      }
      const { kind } = await sourceItemImage(db, item, category.name, category.slug);
      results.push({ itemId: item.id, slug: item.slug, kind });
    }

    return NextResponse.json({ results, sourced: results.length - skipped, skipped });
  } catch (err) {
    console.error("hot-takes source-all failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to source images" },
      { status: 500 },
    );
  }
}
