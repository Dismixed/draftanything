import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { getSeedEntry, updateSeedEntry } from "@/lib/freezeframes/seed-db";
import type { SeedEntryStatus } from "@/lib/freezeframes/seed-types";

const VALID_STATUSES = [
  "draft",
  "needs_media",
  "needs_review",
  "approved",
  "rejected",
] as const;

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
    console.error("freezeframes seed get failed:", err);
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
    const body = await req.json().catch(() => ({}));
    const db = createAdminClient();

    const patch: Parameters<typeof updateSeedEntry>[2] = {};
    if (body.query_title !== undefined) patch.query_title = String(body.query_title);
    if (body.answer !== undefined) patch.answer = body.answer ? String(body.answer) : null;
    if (body.hint !== undefined) patch.hint = body.hint ? String(body.hint) : null;
    if (body.artist !== undefined) patch.artist = body.artist ? String(body.artist) : null;
    if (body.album_name !== undefined) patch.album_name = body.album_name ? String(body.album_name) : null;
    if (body.img !== undefined) patch.img = body.img ? String(body.img) : null;
    if (body.audio !== undefined) patch.audio = body.audio ? String(body.audio) : null;
    if (body.notes !== undefined) patch.notes = body.notes ? String(body.notes) : null;
    if (body.status !== undefined) {
      const status = body.status as SeedEntryStatus;
      if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      patch.status = status;
    }

    const entry = await updateSeedEntry(db, id, patch);
    return NextResponse.json({ entry });
  } catch (err) {
    console.error("freezeframes seed patch failed:", err);
    return NextResponse.json({ error: "Failed to update entry" }, { status: 500 });
  }
}
