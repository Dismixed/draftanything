import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { importSeedFileToDb, listSeedEntries } from "@/lib/anyguessr/seed-db";

export async function GET(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const cca3 = searchParams.get("cca3") ?? undefined;
    const db = createAdminClient();
    const entries = await listSeedEntries(db, { status, cca3, limit: 500 });
    return NextResponse.json({ entries });
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
    if (body.action !== "import") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    const db = createAdminClient();
    const result = await importSeedFileToDb(db);
    return NextResponse.json(result);
  } catch (err) {
    console.error("anyguessr seed import failed:", err);
    return NextResponse.json({ error: "Failed to import seed" }, { status: 500 });
  }
}
