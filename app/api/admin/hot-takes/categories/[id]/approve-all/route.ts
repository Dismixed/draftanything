import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import {
  categoryReadyForApproval,
  getCategory,
  selectedImageUrl,
  updateCategory,
  updateItem,
} from "@/lib/hot-takes/seed-db";

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

    let approved = 0;
    for (const item of category.items) {
      if (!selectedImageUrl(item)) continue;
      await updateItem(db, item.id, { status: "approved" });
      approved += 1;
    }

    const refreshed = await getCategory(db, id);
    if (!refreshed) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const readiness = categoryReadyForApproval(refreshed);
    let categoryApproved = false;
    if (readiness.ready) {
      await updateCategory(db, id, { status: "approved" });
      categoryApproved = true;
    }

    return NextResponse.json({
      approved,
      categoryApproved,
      issues: readiness.issues,
    });
  } catch (err) {
    console.error("hot-takes approve-all failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to approve items" },
      { status: 500 },
    );
  }
}
