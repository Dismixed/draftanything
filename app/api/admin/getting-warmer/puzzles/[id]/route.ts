import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { updatePuzzle, updatePuzzleStatus } from "@/lib/getting-warmer/puzzle-db";
import { z } from "zod/v4";

const patchSchema = z.object({
  answer: z.string().trim().min(1).max(80).optional(),
  clues: z.array(z.string().trim().min(1).max(80)).min(2).max(30).optional(),
  status: z.enum(["draft", "approved", "archived"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await params;

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const db = createAdminClient();
    const puzzle = await updatePuzzle(db, id, parsed.data);
    return NextResponse.json({ puzzle });
  } catch (err) {
    console.error("getting-warmer puzzle update failed:", err);
    return NextResponse.json({ error: "Failed to update puzzle" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { id } = await params;

  try {
    let body: { status?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body.status || !["draft", "approved", "archived"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const db = createAdminClient();
    const puzzle = await updatePuzzleStatus(db, id, body.status);
    return NextResponse.json({ puzzle });
  } catch (err) {
    console.error("getting-warmer puzzle status failed:", err);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
