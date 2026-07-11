import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDailyPuzzle } from "@/lib/chainlink/puzzle-service";

const ONE_DAY_SECONDS = 60 * 60 * 24;

function getCachedDailyPuzzle(today: string) {
  return unstable_cache(
    async () => {
      const db = createAdminClient();
      return getDailyPuzzle(db);
    },
    ["chainlink-daily", today],
    {
      revalidate: ONE_DAY_SECONDS,
      tags: [`chainlink-daily-${today}`],
    },
  )();
}

export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const puzzle = await getCachedDailyPuzzle(today);

    if (!puzzle) {
      return NextResponse.json(
        { error: "No puzzle scheduled for today" },
        { status: 404 },
      );
    }

    return NextResponse.json(puzzle, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("Failed to fetch daily puzzle:", err);
    return NextResponse.json(
      { error: "Failed to fetch puzzle" },
      { status: 500 },
    );
  }
}
