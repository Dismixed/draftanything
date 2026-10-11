import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revealDailyRound } from "@/lib/anyguessr/puzzle-service";
import { MAX_DAILY_ROUNDS } from "@/lib/anyguessr/daily";

export async function POST(req: NextRequest) {
  try {
    let body: { puzzleId?: string; roundIndex?: number; clueType?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { puzzleId, roundIndex } = body;
    if (!puzzleId || typeof puzzleId !== "string") {
      return NextResponse.json({ error: "puzzleId is required" }, { status: 400 });
    }
    if (
      typeof roundIndex !== "number" ||
      !Number.isInteger(roundIndex) ||
      roundIndex < 0 ||
      roundIndex >= MAX_DAILY_ROUNDS
    ) {
      return NextResponse.json({ error: "valid roundIndex is required" }, { status: 400 });
    }

    const db = createAdminClient();
    const clueType = typeof body.clueType === "string" ? body.clueType : undefined;
    const result = await revealDailyRound(db, puzzleId, roundIndex, clueType);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "Puzzle not found" || message === "Invalid round index") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error("anyguessr daily surrender failed:", err);
    return NextResponse.json({ error: "Failed to reveal answer" }, { status: 500 });
  }
}
