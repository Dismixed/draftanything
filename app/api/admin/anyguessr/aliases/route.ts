import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import {
  deleteCountryAlias,
  listCountryAliases,
  seedDefaultAliases,
  upsertCountryAlias,
} from "@/lib/anyguessr/seed-db";
import { invalidateAliasCache } from "@/lib/anyguessr/country-aliases";

export async function GET() {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const db = createAdminClient();
    const aliases = await listCountryAliases(db);
    return NextResponse.json({ aliases });
  } catch (err) {
    console.error("anyguessr aliases list failed:", err);
    return NextResponse.json({ error: "Failed to list aliases" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const body = await req.json();
    const db = createAdminClient();

    if (body.action === "seed_defaults") {
      const result = await seedDefaultAliases(db);
      invalidateAliasCache();
      return NextResponse.json(result);
    }

    const cca3 = body.cca3 as string | undefined;
    const alias = body.alias as string | undefined;
    if (!cca3 || !alias?.trim()) {
      return NextResponse.json({ error: "cca3 and alias are required" }, { status: 400 });
    }

    const row = await upsertCountryAlias(db, cca3, alias);
    invalidateAliasCache();
    return NextResponse.json({ alias: row });
  } catch (err) {
    console.error("anyguessr alias save failed:", err);
    return NextResponse.json({ error: "Failed to save alias" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const db = createAdminClient();
    await deleteCountryAlias(db, id);
    invalidateAliasCache();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("anyguessr alias delete failed:", err);
    return NextResponse.json({ error: "Failed to delete alias" }, { status: 500 });
  }
}
