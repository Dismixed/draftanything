import { z } from "zod/v4";
import { getDateString } from "@/lib/brain-dead/game-logic";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashGuestToken } from "@/features/guest/token";
import { checkRateLimit } from "@/lib/rate-limit";

const DAILY_QUESTION_COUNT = 15;
const MAX_SCORE = 6000;

const submitSchema = z.object({
  guestId: z.string().min(1),
  name: z.string().trim().min(1).max(20),
  score: z.number().int().min(0).max(MAX_SCORE),
  correct: z.number().int().min(0).max(DAILY_QUESTION_COUNT),
  playDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function getPepper(): string {
  const pepper = process.env.GUEST_TOKEN_PEPPER;
  if (!pepper) {
    throw new Error("GUEST_TOKEN_PEPPER is not configured");
  }
  return pepper;
}

export async function POST(request: Request) {
  const rateResult = checkRateLimit(
    "brain-dead-leaderboard-submit",
    30,
    60 * 1000,
  );
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

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const { guestId, name, score, correct } = parsed.data;
  const playDate = parsed.data.playDate ?? getDateString();

  if (playDate !== getDateString()) {
    return Response.json({ error: "INVALID_DATE" }, { status: 400 });
  }

  const tokenHash = hashGuestToken(guestId, getPepper());

  const db = createAdminClient();
  const { data: sessionId, error: rpcError } = await db.rpc(
    "get_active_guest_session_id",
    { p_token_hash: tokenHash },
  );

  if (rpcError || !sessionId) {
    return Response.json(
      { error: "INVALID_GUEST_SESSION" },
      { status: 400 },
    );
  }

  const { data: existing } = await db
    .from("brain_dead_leaderboard")
    .select("id, score")
    .eq("guest_id", sessionId)
    .eq("play_date", playDate)
    .maybeSingle();

  if (existing) {
    if (score <= existing.score) {
      return Response.json({ id: existing.id, updated: false });
    }
    const { data, error } = await db
      .from("brain_dead_leaderboard")
      .update({ score, correct, display_name: name })
      .eq("id", existing.id)
      .select("id")
      .single();
    if (error) {
      return Response.json({ error: "SAVE_FAILED" }, { status: 500 });
    }
    return Response.json({ id: data.id, updated: true });
  }

  const { data, error } = await db
    .from("brain_dead_leaderboard")
    .insert({
      guest_id: sessionId,
      display_name: name,
      score,
      correct,
      play_date: playDate,
    })
    .select("id")
    .single();

  if (error) {
    return Response.json({ error: "SAVE_FAILED" }, { status: 500 });
  }

  return Response.json({ id: data.id, updated: true });
}
