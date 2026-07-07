import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";

export async function GET(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limit = Math.min(Number(searchParams.get("limit")) || 100, 500);

    const db = createAdminClient();
    let query = db
      .from("ag_puzzles")
      .select("id, answer, answer_id, region, status, difficulty, clues, updated_at", {
        count: "exact",
      })
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (status) query = query.eq("status", status);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ puzzles: data ?? [], total: count ?? 0 });
  } catch (err) {
    console.error("anyguessr puzzles list failed:", err);
    return NextResponse.json({ error: "Failed to list puzzles" }, { status: 500 });
  }
}
