import { NextRequest, NextResponse } from "next/server";
import { parseBulkStatus } from "@/lib/admin/bulk-status";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";

/** Sets one status on many puzzles, so a reviewed page is approved in one request. */
export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const change = parseBulkStatus(await req.json().catch(() => null), ["approved", "archived", "draft"] as const);
    if (!change) return NextResponse.json({ error: "Invalid ids or status" }, { status: 400 });

    const { error } = await createAdminClient()
      .from("getting_warmer_puzzles")
      .update({ status: change.status })
      .in("id", change.ids);
    if (error) throw error;

    return NextResponse.json({ updated: change.ids.length });
  } catch (err) {
    console.error("getting-warmer bulk status failed:", err);
    return NextResponse.json({ error: "Failed to update puzzles" }, { status: 500 });
  }
}
