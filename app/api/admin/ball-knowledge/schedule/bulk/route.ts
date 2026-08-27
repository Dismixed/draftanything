import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { autoScheduleCategories } from "@/lib/ball-knowledge/schedule-service";

export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const body = await req.json().catch(() => ({}));
    const db = createAdminClient();
    const result = await autoScheduleCategories(db, {
      startDate: body.startDate ? String(body.startDate) : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("ball-knowledge bulk schedule failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to auto-schedule" },
      { status: 500 },
    );
  }
}
