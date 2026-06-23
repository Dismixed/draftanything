import { z } from "zod/v4";
import { getDateString } from "@/lib/brain-dead/game-logic";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

const DAILY_QUESTION_COUNT = 15;
const MAX_SCORE = 6000;

const submitSchema = z.object({
  playerToken: z.string().uuid(),
  name: z.string().trim().min(1).max(20),
  score: z.number().int().min(0).max(MAX_SCORE),
  correct: z.number().int().min(0).max(DAILY_QUESTION_COUNT),
  playDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playDate = searchParams.get("date") ?? getDateString();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(playDate)) {
    return Response.json({ error: "INVALID_DATE" }, { status: 400 });
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("brain_dead_leaderboard")
    .select("id, display_name, score, correct, play_date, created_at")
    .eq("play_date", playDate)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    return Response.json({ error: "FETCH_FAILED" }, { status: 500 });
  }

  return Response.json({
    entries: (data ?? []).map((row) => ({
      id: row.id,
      name: row.display_name,
      score: row.score,
      correct: row.correct,
      date: row.play_date,
      ts: new Date(row.created_at).getTime(),
    })),
  });
}

export async function POST(request: Request) {
  const rateResult = checkRateLimit("brain-dead-leaderboard-submit", 30, 60 * 1000);
  if (!rateResult.allowed) {
    return Response.json(
      { error: "RATE_LIMITED" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rateResult.retryAfterMs / 1000)) },
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

  const { playerToken, name, score, correct } = parsed.data;
  const playDate = parsed.data.playDate ?? getDateString();

  if (playDate !== getDateString()) {
    return Response.json({ error: "INVALID_DATE" }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: existing } = await db
    .from("brain_dead_leaderboard")
    .select("id, score")
    .eq("player_token", playerToken)
    .eq("play_date", playDate)
    .maybeSingle();

  if (existing && score <= existing.score) {
    return Response.json({
      id: existing.id,
      updated: false,
    });
  }

  const { data, error } = await db
    .from("brain_dead_leaderboard")
    .upsert(
      {
        player_token: playerToken,
        display_name: name,
        score,
        correct,
        play_date: playDate,
      },
      { onConflict: "player_token,play_date" },
    )
    .select("id")
    .single();

  if (error) {
    return Response.json({ error: "SAVE_FAILED" }, { status: 500 });
  }

  return Response.json({
    id: data.id,
    updated: true,
  });
}
