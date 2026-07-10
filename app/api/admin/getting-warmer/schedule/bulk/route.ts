import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { autoScheduleApprovedPuzzles } from "@/lib/getting-warmer/schedule-service";

export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    let body: { startDate?: string } = {};
    try {
      body = await req.json();
    } catch {
      // empty body is fine
    }

    const db = createAdminClient();
    const result = await autoScheduleApprovedPuzzles(db, {
      startDate: body.startDate,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("getting-warmer bulk schedule failed:", err);
    return NextResponse.json({ error: "Failed to auto-schedule" }, { status: 500 });
  }
}
