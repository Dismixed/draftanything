import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";

/* ------------------------------------------------------------------ */
/*  GET — list puzzles with filtering                                  */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const difficulty = searchParams.get("difficulty");
    const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);
    const offset = Number(searchParams.get("offset")) || 0;

    const db = createAdminClient();
    let query = db
      .from("chain_puzzles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq("status", status);
    }
    if (difficulty) {
      query = query.eq("difficulty", difficulty);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ puzzles: data ?? [], total: count ?? 0 });
  } catch (err) {
    console.error("Failed to list puzzles:", err);
    return NextResponse.json({ error: "Failed to list puzzles" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  POST — update puzzle (generic create/update)                      */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const db = createAdminClient();

    const { data, error } = await db
      .from("chain_puzzles")
      .upsert({
        id: body.id ?? undefined,
        title: body.title ?? null,
        words: body.words ?? [],
        phrases: body.phrases ?? [],
        difficulty: body.difficulty ?? "easy",
        theme: body.theme ?? null,
        status: body.status ?? "draft",
        score: body.score ?? 0,
        notes: body.notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ puzzle: data });
  } catch (err) {
    console.error("Failed to save puzzle:", err);
    return NextResponse.json({ error: "Failed to save puzzle" }, { status: 500 });
  }
}
