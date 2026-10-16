import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { fuzzyMatch } from "@/lib/freezeframes/game-logic";
import { jevAccepts } from "@/lib/freezeframes/jev-judge";
import { getDailyAnswers } from "@/lib/freezeframes/puzzle-service";
import type { RoundKey } from "@/lib/freezeframes/types";
import { getPostHogClient, withRequestIdentity } from "@/lib/posthog-server";

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
      const posthog = getPostHogClient();
      posthog.capture(withRequestIdentity(request, {
        event: "freezeframes_guess_submitted",
        properties: { round_key: roundKey, skipped: true, correct: false },
      }));
      await posthog.flush();
      return Response.json({ correct: false, answer });
    }

    const fuzzy = fuzzyMatch(guess!, answer);
    const viaJev = !fuzzy && (await jevAccepts(roundKey as RoundKey, guess!, answer));
    const correct = fuzzy || viaJev;
    const posthog = getPostHogClient();
    posthog.capture(withRequestIdentity(request, {
      event: "freezeframes_guess_submitted",
      properties: { round_key: roundKey, skipped: false, correct, via_jev: viaJev },
    }));
    await posthog.flush();
    return Response.json({
      correct,
      ...(correct ? { answer } : {}),
    });
  } catch (err) {
    console.error("FreezeFrames guess validation failed:", err);
    return Response.json({ error: "VALIDATION_FAILED" }, { status: 500 });
  }
}
