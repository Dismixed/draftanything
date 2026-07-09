import { z } from "zod/v4";
import { getDateString } from "@/lib/frames/game-logic";
import { ensureGuestSession } from "@/features/guest/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_SCORE = 4000;

const submitSchema = z.object({
  name: z.string().trim().min(1).max(20),
  score: z.number().int().min(0).max(MAX_SCORE),
  playDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(request: Request) {
  const rateResult = checkRateLimit(
    "frames-leaderboard-submit",
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

  const { name, score } = parsed.data;
  const playDate = parsed.data.playDate ?? getDateString();

  if (playDate !== getDateString()) {
    return Response.json({ error: "INVALID_DATE" }, { status: 400 });
  }

  const supa = await createClient();
  const { data: auth } = await supa.auth.getUser();
  const userId = auth.user?.id ?? null;

  let guestSessionId: string | null = null;
  if (!userId) {
    try {
      const guest = await ensureGuestSession();
      guestSessionId = guest.guestId;
    } catch {
      return Response.json(
        { error: "INVALID_GUEST_SESSION" },
        { status: 400 },
      );
    }
  }

  const db = createAdminClient();
  const existingQuery = db
    .from("frames_leaderboard")
    .select("id, score")
    .eq("play_date", playDate);

  const { data: existing } = await (userId
    ? existingQuery.eq("user_id", userId)
    : existingQuery.eq("guest_id", guestSessionId!)
  ).maybeSingle();

  if (existing) {
    if (score <= existing.score) {
      return Response.json({ id: existing.id, updated: false });
    }
    const { data, error } = await db
      .from("frames_leaderboard")
      .update({ score, display_name: name })
      .eq("id", existing.id)
      .select("id")
      .single();
    if (error) {
      return Response.json({ error: "SAVE_FAILED" }, { status: 500 });
    }
    return Response.json({ id: data.id, updated: true });
  }

  const { data, error } = await db
    .from("frames_leaderboard")
    .insert({
      guest_id: userId ? null : guestSessionId,
      user_id: userId,
      display_name: name,
      score,
      play_date: playDate,
    })
    .select("id")
    .single();

  if (error) {
    return Response.json({ error: "SAVE_FAILED" }, { status: 500 });
  }

  return Response.json({ id: data.id, updated: true });
}
