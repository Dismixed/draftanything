import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { resolveEntryMedia } from "@/lib/freezeframes/seed-db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { id } = await params;
    const db = createAdminClient();
    const entry = await resolveEntryMedia(db, id);
    return NextResponse.json({ entry });
  } catch (err) {
    console.error("freezeframes seed resolve failed:", err);
    return NextResponse.json({ error: "Failed to resolve media" }, { status: 500 });
  }
}
