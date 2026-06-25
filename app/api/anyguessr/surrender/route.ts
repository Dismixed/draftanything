import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revealAnswer } from "@/lib/anyguessr/puzzle-service";

export async function POST(req: NextRequest) {
  try {
    let body: { puzzleId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { puzzleId } = body;
    if (!puzzleId || typeof puzzleId !== "string") {
      return NextResponse.json({ error: "puzzleId is required" }, { status: 400 });
    }

    const db = createAdminClient();
    const result = await revealAnswer(db, puzzleId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "Puzzle not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error("anyguessr surrender failed:", err);
    return NextResponse.json({ error: "Failed to reveal answer" }, { status: 500 });
  }
}