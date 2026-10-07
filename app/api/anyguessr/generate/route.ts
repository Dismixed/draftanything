import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAll, scheduleDailyPuzzle } from "@/lib/anyguessr/generator";

/**
 * Pipeline: fetch all approved puzzles from the curated country seed, persist
 * them, and schedule today's daily puzzle. The scheduled run now happens in
 * /api/cron/daily; this route remains for manual runs with CRON_SECRET.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    const cronOk =
      process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
    if (!cronOk) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createAdminClient();
    const generateResult = await generateAll(db);
    const daily = await scheduleDailyPuzzle(db).catch((e) => ({
      error: e instanceof Error ? e.message : String(e),
    }));

    return NextResponse.json({ generate: generateResult, daily });
  } catch (err) {
    console.error("anyguessr generate failed:", err);
    return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
  }
}

/**
 * Same handler as a convenience so a HEAD/GET from the Vercel cron can also
 * trigger the pipeline. Most cron jobs send GET by default.
 */
export async function GET(req: NextRequest) {
  return POST(req);
}