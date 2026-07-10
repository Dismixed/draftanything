import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import {
  createCategory,
  getCategory,
  importLegacySeed,
  listCategories,
  replaceCategoryItems,
  updateCategory,
} from "@/lib/hot-takes/seed-db";
import { proposeCategoryItemsWithLlm } from "@/lib/hot-takes/propose";

export async function GET(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const id = searchParams.get("id");

    const db = createAdminClient();

    if (id) {
      const category = await getCategory(db, id);
      if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ category });
    }

    const categories = await listCategories(db, { status });
    return NextResponse.json({ categories });
  } catch (err) {
    console.error("hot-takes categories list failed:", err);
    return NextResponse.json({ error: "Failed to list categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const body = await req.json().catch(() => ({}));
    const db = createAdminClient();

    if (body.action === "import_legacy") {
      const result = await importLegacySeed(db);
      return NextResponse.json(result);
    }

    if (body.action === "propose" && body.category_id) {
      const category = await getCategory(db, body.category_id as string);
      if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });

      const proposals = await proposeCategoryItemsWithLlm(category.name);
      const items = await replaceCategoryItems(db, category.id, proposals);
      await updateCategory(db, category.id, { status: "needs_items" });
      return NextResponse.json({ items });
    }

    if (body.name) {
      const category = await createCategory(db, {
        name: String(body.name),
        notes: body.notes ? String(body.notes) : null,
        proposed_by: "manual",
      });

      if (body.propose_items === true) {
        const proposals = await proposeCategoryItemsWithLlm(category.name);
        const items = await replaceCategoryItems(db, category.id, proposals);
        return NextResponse.json({ category, items });
      }

      return NextResponse.json({ category });
    }

    return NextResponse.json({ error: "Unknown action or missing fields" }, { status: 400 });
  } catch (err) {
    console.error("hot-takes categories POST failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process request" },
      { status: 500 },
    );
  }
}
