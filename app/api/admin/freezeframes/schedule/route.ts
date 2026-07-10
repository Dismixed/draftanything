import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";

export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    let body: { puzzleId?: string; date?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { puzzleId, date } = body;
    if (!puzzleId || !date) {
      return NextResponse.json({ error: "puzzleId and date are required" }, { status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "date must be YYYY-MM-DD format" }, { status: 400 });
    }

    const db = createAdminClient();

    const { data: puzzle, error: puzzleError } = await db
      .from("freezeframes_puzzles")
      .select("id, status")
      .eq("id", puzzleId)
      .single();

    if (puzzleError || !puzzle) {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }

    if (puzzle.status !== "approved") {
      return NextResponse.json(
        { error: "Only approved puzzles can be scheduled" },
        { status: 400 },
      );
    }

    const { data: existing } = await db
      .from("daily_freezeframes_puzzles")
      .select("id")
      .eq("publish_date", date)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A puzzle is already scheduled for this date" },
        { status: 409 },
      );
    }

    const { data, error } = await db
      .from("daily_freezeframes_puzzles")
      .insert({ puzzle_id: puzzleId, publish_date: date })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ schedule: data });
  } catch (err) {
    console.error("Failed to schedule freezeframes puzzle:", err);
    return NextResponse.json({ error: "Failed to schedule puzzle" }, { status: 500 });
  }
}
