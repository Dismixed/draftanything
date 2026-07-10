import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import {
  categoryReadyForApproval,
  getCategory,
  updateCategory,
} from "@/lib/hot-takes/seed-db";
import type { CategoryStatus } from "@/lib/hot-takes/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { id } = await params;
    const body = await req.json();
    const db = createAdminClient();

    if (body.status === "approved") {
      const category = await getCategory(db, id);
      if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const readiness = categoryReadyForApproval(category);
      if (!readiness.ready) {
        return NextResponse.json(
          { error: "Category not ready", issues: readiness.issues },
          { status: 400 },
        );
      }
    }

    const category = await updateCategory(db, id, {
      name: body.name ? String(body.name) : undefined,
      status: body.status as CategoryStatus | undefined,
      cover_image_url:
        body.cover_image_url === null
          ? null
          : body.cover_image_url
            ? String(body.cover_image_url)
            : undefined,
      notes:
        body.notes === null ? null : body.notes ? String(body.notes) : undefined,
    });

    return NextResponse.json({ category });
  } catch (err) {
    console.error("hot-takes category PATCH failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update category" },
      { status: 500 },
    );
  }
}

export async function GET(
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
    return NextResponse.json({ category });
  } catch (err) {
    console.error("hot-takes category GET failed:", err);
    return NextResponse.json({ error: "Failed to load category" }, { status: 500 });
  }
}
