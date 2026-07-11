import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateGuess } from "@/lib/chainlink/puzzle-service";
import { getPostHogClient } from "@/lib/posthog-server";

export async function POST(req: NextRequest) {
  try {
    let body: { puzzleId?: string; position?: number; guess?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { puzzleId, position, guess } = body;

    if (!puzzleId || typeof puzzleId !== "string") {
      return NextResponse.json({ error: "puzzleId is required" }, { status: 400 });
    }
    if (position === undefined || typeof position !== "number" || position < 0) {
      return NextResponse.json({ error: "valid position is required" }, { status: 400 });
    }
    if (!guess || typeof guess !== "string") {
      return NextResponse.json({ error: "guess is required" }, { status: 400 });
    }

    const db = createAdminClient();
    const result = await validateGuess(db, puzzleId, position, guess);

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: puzzleId,
      event: "chainlink_guess_submitted",
      properties: {
        puzzle_id: puzzleId,
        position,
        correct: (result as { correct?: boolean }).correct ?? false,
      },
    });
    await posthog.flush();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "Puzzle not found" || message === "Invalid position") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error("Failed to validate guess:", err);
    return NextResponse.json({ error: "Failed to validate guess" }, { status: 500 });
  }
}
