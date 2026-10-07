import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { dailyChainTag } from "@/lib/chainlink/daily-cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { autoScheduleApprovedPuzzles } from "@/lib/chainlink/schedule-service";

export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    let body: { startDate?: string } = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is fine — defaults to today.
    }

    const db = createAdminClient();
    const result = await autoScheduleApprovedPuzzles(db, {
      startDate: body.startDate,
    });

    // Only a cached day can be stale, and only today is ever cached.
    const today = new Date().toISOString().slice(0, 10);
    if (result.entries.some((entry) => entry.publishDate === today)) {
      revalidateTag(dailyChainTag(today), { expire: 0 });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to auto-schedule";
    console.error("Failed to auto-schedule puzzles:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
