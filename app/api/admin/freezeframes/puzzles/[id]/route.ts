import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { deletePuzzle, getPuzzle } from "@/lib/freezeframes/puzzle-db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { id } = await params;
    const db = createAdminClient();
    const puzzle = await getPuzzle(db, id);
    if (!puzzle) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ puzzle });
  } catch (err) {
    console.error("freezeframes puzzle get failed:", err);
    return NextResponse.json({ error: "Failed to load puzzle" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { id } = await params;
    const db = createAdminClient();
    await deletePuzzle(db, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("freezeframes puzzle delete failed:", err);
    return NextResponse.json({ error: "Failed to delete puzzle" }, { status: 500 });
  }
}
