import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { getCategory, replaceCategoryItems } from "@/lib/hot-takes/seed-db";
import { proposeCategoryItemsWithLlm } from "@/lib/hot-takes/propose";

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

    const proposals = await proposeCategoryItemsWithLlm(category.name);
    const items = await replaceCategoryItems(db, category.id, proposals);
    return NextResponse.json({ items });
  } catch (err) {
    console.error("hot-takes propose failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to propose items" },
      { status: 500 },
    );
  }
}
