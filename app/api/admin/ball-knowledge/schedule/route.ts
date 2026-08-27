import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { listSchedule } from "@/lib/ball-knowledge/schedule-service";

export async function GET() {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const db = createAdminClient();
    const schedule = await listSchedule(db);
    return NextResponse.json({ schedule });
  } catch (err) {
    console.error("ball-knowledge schedule list failed:", err);
    return NextResponse.json({ error: "Failed to list schedule" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const body = await req.json();
    const { category, date } = body as { category?: string; date?: string };
    if (!category || !date) {
      return NextResponse.json(
        { error: "category and date are required" },
        { status: 400 },
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "date must be YYYY-MM-DD" },
        { status: 400 },
      );
    }

    const db = createAdminClient();

    const { data: existing } = await db
      .from("ball_knowledge_schedule")
      .select("id")
      .eq("publish_date", date)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A category is already scheduled for this date" },
        { status: 409 },
      );
    }

    const { data, error } = await db
      .from("ball_knowledge_schedule")
      .insert({ category: category.trim(), publish_date: date })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ schedule: data });
  } catch (err) {
    console.error("ball-knowledge schedule POST failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to schedule" },
      { status: 500 },
    );
  }
}
