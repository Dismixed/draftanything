import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateDailyGuess } from "@/lib/anyguessr/puzzle-service";
import { MAX_DAILY_ROUNDS } from "@/lib/anyguessr/daily";
import { guessEventProperties } from "@/lib/anyguessr/guess-event";
import { getPostHogClient } from "@/lib/posthog-server";

export async function POST(req: NextRequest) {
  try {
    let body: { puzzleId?: string; guess?: string; roundIndex?: number; clueType?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { puzzleId, guess, roundIndex } = body;
    if (!puzzleId || typeof puzzleId !== "string") {
      return NextResponse.json({ error: "puzzleId is required" }, { status: 400 });
    }
    if (!guess || typeof guess !== "string") {
      return NextResponse.json({ error: "guess is required" }, { status: 400 });
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
    const result = await validateDailyGuess(db, puzzleId, guess, roundIndex, clueType);
    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: puzzleId,
      event: "anyguessr_daily_guess_submitted",
      properties: guessEventProperties(puzzleId, roundIndex, result, body.clueType),
    });
    await posthog.flush();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "Puzzle not found" || message === "Invalid round index") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error("anyguessr daily guess failed:", err);
    return NextResponse.json({ error: "Failed to validate guess" }, { status: 500 });
  }
}
