import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRandomApprovedPuzzle } from "@/lib/chainlink/puzzle-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const difficulty = searchParams.get("difficulty") ?? undefined;

    const db = createAdminClient();
    const puzzle = await getRandomApprovedPuzzle(db, { difficulty });

    if (!puzzle) {
      return NextResponse.json(
        { error: "No approved puzzles available" },
        { status: 404 },
      );
    }

    return NextResponse.json(puzzle);
  } catch (err) {
    console.error("Failed to fetch random puzzle:", err);
    return NextResponse.json(
      { error: "Failed to fetch puzzle" },
      { status: 500 },
    );
  }
}
