import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { listPuzzles } from "@/lib/freezeframes/puzzle-db";

export async function GET(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const limit = Number(searchParams.get("limit")) || 100;
    const offset = Number(searchParams.get("offset")) || 0;

    const db = createAdminClient();
    const result = await listPuzzles(db, { status, limit, offset });
    return NextResponse.json(result);
  } catch (err) {
    console.error("freezeframes puzzles list failed:", err);
    return NextResponse.json({ error: "Failed to list puzzles" }, { status: 500 });
  }
}
