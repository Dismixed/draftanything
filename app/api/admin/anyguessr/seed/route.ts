import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import {
  approveFlagsWithImages,
  ensureMissingSeedEntries,
  hydrateSeedEntriesFromPuzzles,
  importSeedFileToDb,
  listSeedEntries,
} from "@/lib/anyguessr/seed-db";
import {
  computeDailyUsageIndex,
  dailyUsageForSeedEntry,
  type DailyPickRow,
} from "@/lib/anyguessr/daily-usage";

export async function GET(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const cca3 = searchParams.get("cca3") ?? undefined;
    const clueType = searchParams.get("clue_type") ?? undefined;
    const db = createAdminClient();
    await ensureMissingSeedEntries(db);
    const entries = await listSeedEntries(db, { status, cca3, clueType, limit: 5000 });

    const { data: puzzles, error: puzzleErr } = await db
      .from("ag_puzzles")
      .select("id, answer_id, clues")
      .in("status", ["approved", "published"])
      .order("id", { ascending: true })
      .limit(500);

    if (puzzleErr) throw puzzleErr;

    const puzzleRows = (puzzles ?? []) as unknown as DailyPickRow[];

    const puzzleIdByCca3: Record<string, string> = {};
    for (const row of puzzleRows) {
      if (row.answer_id && !puzzleIdByCca3[row.answer_id]) {
        puzzleIdByCca3[row.answer_id] = row.id;
      }
    }

    const dailyUsage = computeDailyUsageIndex(puzzleRows);
    const entriesWithUsage = entries.map((entry) => ({
      ...entry,
      daily_dates: dailyUsageForSeedEntry(
        dailyUsage,
        puzzleIdByCca3,
        entry.cca3,
        entry.clue_type,
      ),
    }));

    return NextResponse.json({ entries: entriesWithUsage, puzzleIdByCca3 });
  } catch (err) {
    console.error("anyguessr seed list failed:", err);
    return NextResponse.json({ error: "Failed to list seed entries" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const body = await req.json().catch(() => ({}));
    const db = createAdminClient();

    if (body.action === "import") {
      const result = await importSeedFileToDb(db);
      return NextResponse.json(result);
    }
    if (body.action === "hydrate_from_puzzles") {
      const result = await hydrateSeedEntriesFromPuzzles(db);
      return NextResponse.json(result);
    }
    if (body.action === "approve_flags_with_images") {
      await ensureMissingSeedEntries(db);
      const result = await approveFlagsWithImages(db);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("anyguessr seed import failed:", err);
    return NextResponse.json({ error: "Failed to import seed" }, { status: 500 });
  }
}
