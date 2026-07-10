import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { getItem, updateItem } from "@/lib/hot-takes/seed-db";
import type { ImageSource, ItemStatus } from "@/lib/hot-takes/types";

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

    const item = await updateItem(db, id, {
      label: body.label ? String(body.label) : undefined,
      slug: body.slug ? String(body.slug) : undefined,
      wiki_title:
        body.wiki_title === null
          ? null
          : body.wiki_title
            ? String(body.wiki_title)
            : undefined,
      sort_order: typeof body.sort_order === "number" ? body.sort_order : undefined,
      image_url:
        body.image_url === null
          ? null
          : body.image_url
            ? String(body.image_url)
            : undefined,
      image_candidates: Array.isArray(body.image_candidates)
        ? body.image_candidates
        : undefined,
      selected_candidate_index:
        typeof body.selected_candidate_index === "number"
          ? body.selected_candidate_index
          : undefined,
      image_source: body.image_source as ImageSource | null | undefined,
      status: body.status as ItemStatus | undefined,
      notes:
        body.notes === null ? null : body.notes ? String(body.notes) : undefined,
    });

    return NextResponse.json({ item });
  } catch (err) {
    console.error("hot-takes item PATCH failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update item" },
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
    const item = await getItem(db, id);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item });
  } catch (err) {
    console.error("hot-takes item GET failed:", err);
    return NextResponse.json({ error: "Failed to load item" }, { status: 500 });
  }
}
