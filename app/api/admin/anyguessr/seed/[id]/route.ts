import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { getSeedEntry, updateSeedEntry } from "@/lib/anyguessr/seed-db";
import type { SeedEntryStatus } from "@/lib/anyguessr/seed-types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { id } = await params;
    const db = createAdminClient();
    const entry = await getSeedEntry(db, id);
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ entry });
  } catch (err) {
    console.error("anyguessr seed get failed:", err);
    return NextResponse.json({ error: "Failed to load entry" }, { status: 500 });
  }
}

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

    const entry = await updateSeedEntry(db, id, {
      wiki_title: body.wiki_title,
      text_content: body.text_content,
      status: body.status as SeedEntryStatus | undefined,
      image_candidates: body.image_candidates,
      selected_candidate_index: body.selected_candidate_index,
      vision_pass: body.vision_pass,
      vision_notes: body.vision_notes,
      notes: body.notes,
    });

    return NextResponse.json({ entry });
  } catch (err) {
    console.error("anyguessr seed patch failed:", err);
    return NextResponse.json({ error: "Failed to update entry" }, { status: 500 });
  }
}
