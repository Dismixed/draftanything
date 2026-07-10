import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { listSchedule, scheduleCategory } from "@/lib/hot-takes/seed-db";

export async function GET(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
    const db = createAdminClient();
    const schedule = await listSchedule(db, { from });
    return NextResponse.json({ schedule });
  } catch (err) {
    console.error("hot-takes schedule list failed:", err);
    return NextResponse.json({ error: "Failed to list schedule" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const body = await req.json();
    const { categoryId, date } = body;
    if (!categoryId || !date) {
      return NextResponse.json({ error: "categoryId and date are required" }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
    }

    const db = createAdminClient();
    const row = await scheduleCategory(db, categoryId, date);
    return NextResponse.json({ schedule: row });
  } catch (err) {
    console.error("hot-takes schedule POST failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to schedule" },
      { status: 500 },
    );
  }
}
