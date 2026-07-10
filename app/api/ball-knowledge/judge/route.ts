import { z } from "zod/v4";
import { generateJson } from "@/features/ai/gemini";
import { getTodayCategory } from "@/lib/ball-knowledge/game-logic";
import { checkRateLimit } from "@/lib/rate-limit";

const judgeSchema = z.object({
  valid: z.boolean(),
  canonical: z.string(),
  reason: z.string(),
});

const bodySchema = z.object({
  category: z.string().min(1),
  answer: z.string().trim().min(1).max(120),
  accepted: z.array(z.string()).max(200),
});

export async function POST(request: Request) {
  const rateResult = checkRateLimit("bk-judge", 60, 60 * 1000);
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

  const { category, answer, accepted } = parsed.data;

  if (category !== getTodayCategory()) {
    return Response.json({ error: "INVALID_CATEGORY" }, { status: 400 });
  }

  const systemPrompt = `You are the judge for a daily trivia game called "Ball Knowledge". The category for this round is: "${category}".
A player is typing as many correct, distinct items in this category as they can within a time limit. The submitted answer below was NOT found in our curated answer list for this category, so use your own knowledge to judge it fairly — plenty of correct answers won't be pre-listed.

Decide:
1) Does the submitted answer genuinely and unambiguously belong to the category? Be lenient about capitalization, minor typos, common abbreviations, and well-known nicknames, but reject anything that is not actually a real, correct member of the category, and reject vague/joke/non-answers.
2) Is it a duplicate (by meaning) of something already accepted, even if spelled, capitalized, or abbreviated differently?

Respond with valid=true/false, canonical as a clean display form of the answer, and reason as a max 4 word explanation when invalid.`;

  const userPrompt = `Already accepted: ${JSON.stringify(accepted)}\nSubmitted answer: "${answer}"`;

  try {
    const result = await generateJson({
      systemPrompt,
      userPrompt,
      schema: judgeSchema,
      schemaName: "ball_knowledge_judge",
      maxOutputTokens: 300,
      timeoutMs: 15_000,
    });

    return Response.json({
      valid: result.valid,
      canonical: result.canonical || answer,
      reason: result.reason || "not valid",
    });
  } catch {
    return Response.json({ error: "JUDGE_FAILED" }, { status: 503 });
  }
}
