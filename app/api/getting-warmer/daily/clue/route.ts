import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateClueState } from "@/lib/getting-warmer/game-logic";
import { getDailyAnswer, resolveNextClue } from "@/lib/getting-warmer/puzzle-service";

const bodySchema = z.object({
  revealedClueCount: z.number().int().min(2).max(200),
  wrongGuesses: z.array(z.string().max(120)).max(200),
  extraClues: z.array(z.string().max(200)).max(200),
});

/** Prefetch the next clue without submitting a guess — enables seamless loading. */
export async function POST(request: Request) {
  const rateResult = checkRateLimit("gw-clue", 60, 60 * 1000);
  if (!rateResult.allowed) {
    return Response.json(
      { error: "RATE_LIMITED" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateResult.retryAfterMs / 1000)),
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const { revealedClueCount, wrongGuesses, extraClues } = parsed.data;

  try {
    const db = createAdminClient();
    const puzzle = await getDailyAnswer(db);

    if (!validateClueState(revealedClueCount, wrongGuesses, puzzle.clues.length, extraClues)) {
      return Response.json({ error: "INVALID_STATE" }, { status: 400 });
    }

    const nextClue = await resolveNextClue(db, {
      revealedClueCount,
      wrongGuesses,
      extraClues,
    });

    const isAiClue = revealedClueCount >= puzzle.clues.length;

    return Response.json({ nextClue, isAiClue });
  } catch (err) {
    console.error("Getting Warmer clue prefetch failed:", err);
    return Response.json({ error: "CLUE_FAILED" }, { status: 500 });
  }
}
