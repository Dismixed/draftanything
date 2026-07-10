import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { generatePuzzleBundles } from "@/lib/freezeframes/generator";
import { scheduleDailyPuzzle } from "@/lib/freezeframes/schedule-service";

export async function POST() {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const db = createAdminClient();
    const result = await generatePuzzleBundles(db);
    const daily = await scheduleDailyPuzzle(db).catch((e) => ({
      error: e instanceof Error ? e.message : String(e),
    }));
    return NextResponse.json({ ...result, daily });
  } catch (err) {
    console.error("freezeframes generate failed:", err);
    return NextResponse.json({ error: "Failed to generate puzzles" }, { status: 500 });
  }
}
