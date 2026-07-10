import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdmin } from "@/lib/chainlink/admin-guard";
import { listPuzzles, createPuzzle } from "@/lib/getting-warmer/puzzle-db";
import { z } from "zod/v4";

const createSchema = z.object({
  answer: z.string().trim().min(1).max(80),
  clues: z.array(z.string().trim().min(1).max(80)).min(2).max(30),
  status: z.enum(["draft", "approved", "archived"]).optional(),
});

export async function GET(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const limit = Number(searchParams.get("limit")) || 100;
    const offset = Number(searchParams.get("offset")) || 0;

    const db = createAdminClient();
    const result = await listPuzzles(db, { status, limit, offset });
    return NextResponse.json(result);
  } catch (err) {
    console.error("getting-warmer puzzles list failed:", err);
    return NextResponse.json({ error: "Failed to list puzzles" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid puzzle data" }, { status: 400 });
    }

    const db = createAdminClient();
    const puzzle = await createPuzzle(db, parsed.data);
    return NextResponse.json({ puzzle });
  } catch (err) {
    console.error("getting-warmer puzzle create failed:", err);
    return NextResponse.json({ error: "Failed to create puzzle" }, { status: 500 });
  }
}
