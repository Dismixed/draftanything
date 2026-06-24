import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";

const VALID_STATUSES = ["draft", "approved", "rejected", "published"] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await checkAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  try {
    let body: { status?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { status: newStatus } = body;

    if (!newStatus || !VALID_STATUSES.includes(newStatus as typeof VALID_STATUSES[number])) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }

    const db = createAdminClient();
    const { data, error } = await db
      .from("chain_puzzles")
      .update({
        status: newStatus,
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
    console.error("Failed to update puzzle status:", err);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
