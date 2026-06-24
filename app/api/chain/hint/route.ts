import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateHint } from "@/lib/chainlink/puzzle-service";

export async function POST(req: NextRequest) {
  try {
    let body: { puzzleId?: string; position?: number; revealedLetters?: number };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { puzzleId, position, revealedLetters } = body;

    if (!puzzleId || typeof puzzleId !== "string") {
      return NextResponse.json({ error: "puzzleId is required" }, { status: 400 });
    }
    if (position === undefined || typeof position !== "number" || position < 0) {
      return NextResponse.json({ error: "valid position is required" }, { status: 400 });
    }
    if (revealedLetters === undefined || typeof revealedLetters !== "number") {
      return NextResponse.json({ error: "revealedLetters is required" }, { status: 400 });
    }

    const db = createAdminClient();
    const result = await generateHint(db, puzzleId, position, revealedLetters);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "Puzzle not found" || message === "Invalid position") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error("Failed to generate hint:", err);
    return NextResponse.json({ error: "Failed to generate hint" }, { status: 500 });
  }
}
