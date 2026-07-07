import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { generateAll, scheduleDailyPuzzle } from "@/lib/anyguessr/generator";

export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const body = await req.json().catch(() => ({}));
    const limit = typeof body.limit === "number" ? body.limit : undefined;

    const db = createAdminClient();
    const generate = await generateAll(db, { limit });
    const daily = await scheduleDailyPuzzle(db).catch((e) => ({
      error: e instanceof Error ? e.message : String(e),
    }));

    return NextResponse.json({ generate, daily });
  } catch (err) {
    console.error("anyguessr admin generate failed:", err);
    return NextResponse.json({ error: "Failed to generate puzzles" }, { status: 500 });
  }
}
