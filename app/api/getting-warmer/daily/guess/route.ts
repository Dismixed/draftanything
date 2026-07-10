import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  guessesMatch,
  validateClueState,
} from "@/lib/getting-warmer/game-logic";
import { getDailyAnswer, resolveNextClue } from "@/lib/getting-warmer/puzzle-service";

const bodySchema = z.object({
  guess: z.string().trim().max(120).optional(),
  giveUp: z.boolean().optional(),
  revealedClueCount: z.number().int().min(2).max(200),
  wrongGuesses: z.array(z.string().max(120)).max(200),
  extraClues: z.array(z.string().max(200)).max(200),
});

export async function POST(request: Request) {
  const rateResult = checkRateLimit("gw-guess", 120, 60 * 1000);
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

  const { giveUp, revealedClueCount, wrongGuesses, extraClues } = parsed.data;
  const guess = parsed.data.guess?.trim();

  try {
    const db = createAdminClient();
    const puzzle = await getDailyAnswer(db);

    if (!validateClueState(revealedClueCount, wrongGuesses, puzzle.clues.length, extraClues)) {
      return Response.json({ error: "INVALID_STATE" }, { status: 400 });
    }

    if (giveUp) {
      return Response.json({
        correct: false,
        gaveUp: true,
        answer: puzzle.answer,
        attempts: wrongGuesses.length,
      });
    }

    if (!guess) {
      return Response.json({ error: "GUESS_REQUIRED" }, { status: 400 });
    }

    const attempts = wrongGuesses.length + 1;
    const correct = guessesMatch(guess, puzzle.answer);

    if (correct) {
      return Response.json({
        correct: true,
        answer: puzzle.answer,
        attempts,
      });
    }

    const nextClue = await resolveNextClue(db, {
      revealedClueCount,
      wrongGuesses: [...wrongGuesses, guess],
      extraClues,
    });

    const isAiClue = revealedClueCount >= puzzle.clues.length;
    const newExtraClues = isAiClue ? [...extraClues, nextClue] : extraClues;

    return Response.json({
      correct: false,
      nextClue,
      isAiClue,
      extraClues: newExtraClues,
      attempts,
    });
  } catch (err) {
    console.error("Getting Warmer guess failed:", err);
    return Response.json({ error: "GUESS_FAILED" }, { status: 500 });
  }
}
