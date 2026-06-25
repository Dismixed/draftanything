import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRandomApprovedPuzzle } from "@/lib/anyguessr/puzzle-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const excludeRaw = searchParams.get("exclude") ?? "";
    const excludeIds = excludeRaw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const db = createAdminClient();
    const puzzle = await getRandomApprovedPuzzle(db, {
      excludeIds: excludeIds.length ? excludeIds : undefined,
    });
    if (!puzzle) {
      return NextResponse.json({ error: "No approved puzzles available" }, { status: 404 });
    }
    return NextResponse.json(puzzle);
  } catch (err) {
    console.error("anyguessr infinite failed:", err);
    return NextResponse.json({ error: "Failed to fetch puzzle" }, { status: 500 });
  }
}