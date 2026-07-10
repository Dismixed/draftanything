import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import {
  createSeedEntry,
  importSeedFileToDb,
  listSeedEntries,
  resolveEntryMedia,
} from "@/lib/freezeframes/seed-db";
import { mapPool } from "@/lib/anyguessr/async-pool";
import type { RoundKey } from "@/lib/freezeframes/types";

export async function GET(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const roundKey = searchParams.get("round_key") ?? undefined;
    const db = createAdminClient();
    const entries = await listSeedEntries(db, { status, roundKey });
    return NextResponse.json({ entries });
  } catch (err) {
    console.error("freezeframes seed list failed:", err);
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

    if (body.action === "resolve_all_draft") {
      const drafts = await listSeedEntries(db, { status: "draft" });
      const results = await mapPool(drafts, 3, async (entry) => {
        try {
          const resolved = await resolveEntryMedia(db, entry.id);
          if (resolved.skippedResolve) {
            return { id: entry.id, ok: true, skipped: true };
          }
          return { id: entry.id, ok: true };
        } catch (err) {
          return {
            id: entry.id,
            ok: false,
            error: err instanceof Error ? err.message : "resolve failed",
          };
        }
      });
      const resolved = results.filter((r) => r.ok && !r.skipped).length;
      const skipped = results.filter((r) => r.ok && r.skipped).length;
      return NextResponse.json({ resolved, skipped, total: drafts.length, results });
    }

    if (body.round_key && body.query_title) {
      const entry = await createSeedEntry(db, {
        round_key: body.round_key as RoundKey,
        query_title: String(body.query_title),
        notes: body.notes ? String(body.notes) : null,
      });
      return NextResponse.json({ entry });
    }

    return NextResponse.json({ error: "Unknown action or missing fields" }, { status: 400 });
  } catch (err) {
    console.error("freezeframes seed POST failed:", err);
    return NextResponse.json({ error: "Failed to process seed request" }, { status: 500 });
  }
}
