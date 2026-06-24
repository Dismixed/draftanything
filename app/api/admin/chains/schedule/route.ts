import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";

export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    let body: { puzzleId?: string; date?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { puzzleId, date } = body;

    if (!puzzleId || !date) {
      return NextResponse.json(
        { error: "puzzleId and date are required" },
        { status: 400 },
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "date must be YYYY-MM-DD format" },
        { status: 400 },
      );
    }

    const db = createAdminClient();

    // Check puzzle exists and is approved
    const { data: puzzle, error: puzzleError } = await db
      .from("chain_puzzles")
      .select("id, status")
      .eq("id", puzzleId)
      .single();

    if (puzzleError || !puzzle) {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }

    if (puzzle.status !== "approved" && puzzle.status !== "published") {
      return NextResponse.json(
        { error: "Only approved puzzles can be scheduled" },
        { status: 400 },
      );
    }

    // Check date is not already taken
    const { data: existing } = await db
      .from("daily_chain_puzzles")
      .select("id")
      .eq("publish_date", date)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A puzzle is already scheduled for this date" },
        { status: 409 },
      );
    }

    // Create schedule entry
    const { data, error } = await db
      .from("daily_chain_puzzles")
      .insert({
        puzzle_id: puzzleId,
        publish_date: date,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update puzzle status to scheduled
    await db
      .from("chain_puzzles")
      .update({
        status: "scheduled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", puzzleId);

    return NextResponse.json({ schedule: data });
  } catch (err) {
    console.error("Failed to schedule puzzle:", err);
    return NextResponse.json({ error: "Failed to schedule puzzle" }, { status: 500 });
  }
}
