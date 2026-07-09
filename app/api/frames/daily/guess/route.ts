import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { fuzzyMatch } from "@/lib/frames/game-logic";
import { getDailyAnswers } from "@/lib/frames/puzzle-service";
import type { RoundKey } from "@/lib/frames/types";

const guessSchema = z
  .object({
    roundKey: z.enum(["movie", "song", "show", "album"]),
    guess: z.string().trim().max(120).optional(),
    skip: z.boolean().optional(),
  })
  .refine((data) => data.skip || (data.guess && data.guess.length > 0), {
    message: "guess required unless skipping",
  });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const parsed = guessSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const { roundKey, guess, skip } = parsed.data;

  try {
    const db = createAdminClient();
    const answers = await getDailyAnswers(db);
    const answer = answers[roundKey as RoundKey];

    if (skip) {
      return Response.json({ correct: false, answer });
    }

    const correct = fuzzyMatch(guess!, answer);
    return Response.json({
      correct,
      ...(correct ? { answer } : {}),
    });
  } catch (err) {
    console.error("Frames guess validation failed:", err);
    return Response.json({ error: "VALIDATION_FAILED" }, { status: 500 });
  }
}
