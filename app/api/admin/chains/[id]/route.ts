import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";

/* ------------------------------------------------------------------ */
/*  GET — get single puzzle                                           */
/* ------------------------------------------------------------------ */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await checkAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("chain_puzzles")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }

    return NextResponse.json({ puzzle: data });
  } catch (err) {
    console.error("Failed to get puzzle:", err);
    return NextResponse.json({ error: "Failed to get puzzle" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  PUT — update puzzle fields                                        */
/* ------------------------------------------------------------------ */

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await checkAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const db = createAdminClient();

    const { data, error } = await db
      .from("chain_puzzles")
      .update({
        title: body.title ?? undefined,
        words: body.words ?? undefined,
        phrases: body.phrases ?? undefined,
        difficulty: body.difficulty ?? undefined,
        theme: body.theme ?? undefined,
        status: body.status ?? undefined,
        notes: body.notes ?? undefined,
        score: body.score ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ puzzle: data });
  } catch (err) {
    console.error("Failed to update puzzle:", err);
    return NextResponse.json({ error: "Failed to update puzzle" }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  DELETE — remove a puzzle                                          */
/* ------------------------------------------------------------------ */

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await checkAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const db = createAdminClient();
    const { error } = await db.from("chain_puzzles").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to delete puzzle:", err);
    return NextResponse.json({ error: "Failed to delete puzzle" }, { status: 500 });
  }
}
