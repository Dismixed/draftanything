import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureGuestSession } from "@/features/guest/session";
import { createClient } from "@/lib/supabase/server";

interface AttemptBody {
  puzzleId?: string;
  mode?: string;
  completed?: boolean;
  surrendered?: boolean;
  correct?: boolean;
  score?: number;
  guesses?: number;
  cluesRevealed?: number;
}

export async function POST(req: NextRequest) {
  try {
    let body: AttemptBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      puzzleId,
      mode,
      completed,
      surrendered,
      correct,
      score,
      guesses,
      cluesRevealed,
    } = body;

    if (!puzzleId || typeof puzzleId !== "string") {
      return NextResponse.json({ error: "puzzleId is required" }, { status: 400 });
    }
    if (!mode || !["daily", "infinite"].includes(mode)) {
      return NextResponse.json({ error: "valid mode is required" }, { status: 400 });
    }

    // Resolve identity — prefer an authed user; fall back to a guest session.
    const supa = await createClient();
    const { data: auth } = await supa.auth.getUser();
    const userId = auth.user?.id ?? null;

    let guestId: string | null = null;
    if (!userId) {
      try {
        const guest = await ensureGuestSession();
        guestId = guest.guestId;
      } catch {
        // Without a guest session we still record the attempt anonymously (user_id/guest_id null).
      }
    }

    const db = createAdminClient();
    const { error } = await db.from("ag_puzzle_attempts").insert({
      user_id: userId,
      guest_id: guestId,
      puzzle_id: puzzleId,
      mode,
      completed: !!completed,
      surrendered: !!surrendered,
      correct: !!correct,
      score: typeof score === "number" ? score : 0,
      guesses: typeof guesses === "number" ? guesses : 0,
      clues_revealed: typeof cluesRevealed === "number" ? cluesRevealed : 0,
    });

    if (error) {
      console.error("anyguessr attempt save failed:", error);
      return NextResponse.json({ error: "Failed to save attempt" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("anyguessr attempt failed:", err);
    return NextResponse.json({ error: "Failed to save attempt" }, { status: 500 });
  }
}