import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateGuess } from "@/lib/anyguessr/puzzle-service";

export async function POST(req: NextRequest) {
  try {
    let body: { puzzleId?: string; guess?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { puzzleId, guess } = body;
    if (!puzzleId || typeof puzzleId !== "string") {
      return NextResponse.json({ error: "puzzleId is required" }, { status: 400 });
    }
    if (!guess || typeof guess !== "string") {
      return NextResponse.json({ error: "guess is required" }, { status: 400 });
    }

    const db = createAdminClient();
    const result = await validateGuess(db, puzzleId, guess);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "Puzzle not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error("anyguessr guess failed:", err);
    return NextResponse.json({ error: "Failed to validate guess" }, { status: 500 });
  }
}