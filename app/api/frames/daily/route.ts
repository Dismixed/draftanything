import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDailyPuzzle } from "@/lib/frames/puzzle-service";

export async function GET() {
  try {
    const db = createAdminClient();
    const puzzle = await getDailyPuzzle(db);

    if (!puzzle) {
      return NextResponse.json(
        { error: "No puzzle scheduled for today" },
        { status: 404 },
      );
    }

    return NextResponse.json(puzzle);
  } catch (err) {
    console.error("Failed to fetch Frames daily puzzle:", err);
    return NextResponse.json(
      { error: "Failed to fetch puzzle" },
      { status: 500 },
    );
  }
}
