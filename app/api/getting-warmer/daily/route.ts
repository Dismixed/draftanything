import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDailyPuzzle } from "@/lib/getting-warmer/puzzle-service";

export async function GET() {
  try {
    const db = createAdminClient();
    const puzzle = await getDailyPuzzle(db);
    return NextResponse.json(puzzle);
  } catch (err) {
    console.error("Failed to fetch Getting Warmer daily puzzle:", err);
    return NextResponse.json(
      { error: "Failed to fetch puzzle" },
      { status: 500 },
    );
  }
}
