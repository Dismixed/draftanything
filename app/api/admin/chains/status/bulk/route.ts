import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";

export async function POST() {
  const admin = await checkAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("chain_puzzles")
      .update({
        status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("status", "draft")
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ approved: data?.length ?? 0 });
  } catch (err) {
    console.error("Failed to bulk-approve draft puzzles:", err);
    return NextResponse.json(
      { error: "Failed to approve draft puzzles" },
      { status: 500 },
    );
  }
}
