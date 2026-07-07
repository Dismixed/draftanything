import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { SEED } from "@/lib/anyguessr/seed";
import { upsertSeedEntry } from "@/lib/anyguessr/seed-db";
import { proposeSeedEntriesWithLlm } from "@/lib/anyguessr/seed-propose";

export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const body = await req.json();
    const cca3 = body.cca3 as string | undefined;
    if (!cca3) {
      return NextResponse.json({ error: "cca3 is required" }, { status: 400 });
    }

    const seed = SEED.find((s) => s.cca3 === cca3);
    if (!seed) {
      return NextResponse.json({ error: "Unknown country in seed" }, { status: 404 });
    }

    const proposals = await proposeSeedEntriesWithLlm({
      cca3: seed.cca3,
      country: seed.common,
      region: seed.region,
      capital: seed.capital,
    });

    const db = createAdminClient();
    const saved = [];
    for (const p of proposals) {
      const row = await upsertSeedEntry(db, {
        cca3: seed.cca3,
        country_common: seed.common,
        clue_type: p.clue_type,
        wiki_title: p.wiki_title,
        text_content: p.text_content,
        status: "draft",
        proposed_by: "llm",
        notes: p.notes ?? null,
      });
      saved.push(row);
    }

    return NextResponse.json({ entries: saved });
  } catch (err) {
    console.error("anyguessr seed propose failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to propose seed" },
      { status: 500 },
    );
  }
}
