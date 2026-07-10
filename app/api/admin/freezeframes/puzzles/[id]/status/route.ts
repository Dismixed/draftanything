import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { updatePuzzleStatus } from "@/lib/freezeframes/puzzle-db";

const VALID_STATUSES = ["draft", "approved", "archived"] as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const status = body.status as string;

    if (!status || !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }

    const db = createAdminClient();
    const puzzle = await updatePuzzleStatus(db, id, status);
    return NextResponse.json({ puzzle });
  } catch (err) {
    console.error("freezeframes puzzle status failed:", err);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
