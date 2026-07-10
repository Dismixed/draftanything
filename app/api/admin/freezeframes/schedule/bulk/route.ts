import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { autoScheduleApprovedPuzzles } from "@/lib/freezeframes/schedule-service";

export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    let body: { startDate?: string } = {};
    try {
      body = await req.json();
    } catch {
      // empty body ok
    }

    const db = createAdminClient();
    const result = await autoScheduleApprovedPuzzles(db, { startDate: body.startDate });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to auto-schedule";
    console.error("Failed to auto-schedule freezeframes puzzles:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
