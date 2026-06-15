import { z } from "zod/v4";
import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateCommentaryTrigger } from "@/features/ai/commentary-trigger";
import {
  generateCommentary,
  makeIdempotencyKey,
} from "@/features/ai/commentary";
import { getDraftRoomProjection } from "@/features/draft/projection";

const commentaryRequestSchema = z.object({
  draftId: z.string().uuid(),
});

async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
): Promise<T | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt === maxRetries) {
        console.error("[commentary] All retries exhausted:", e);
        return null;
      }
    }
  }
  return null;
}

/**
 * POST /api/ai/commentary
 *
 * Evaluates the most recent pick for commentary triggers and generates AI
 * commentary if warranted. This is designed to be called fire-and-forget
 * after a pick is submitted — the response does not block the caller.
 */
export async function POST(
  request: Request,
) {
  try {
    const { guestId } = await requireGuestSession();

    const rateResult = checkRateLimit(
      `commentary:${guestId}`,
      30,
      60 * 1000,
    );

    if (!rateResult.allowed) {
      return Response.json(
        { error: "RATE_LIMITED", message: "Too many requests." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const parseResult = commentaryRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json(
        { error: "INVALID_INPUT", issues: parseResult.error.issues },
        { status: 400 },
      );
    }

    const { draftId } = parseResult.data;
    const db = createAdminClient();

    // Fetch the draft for rubric and topic
    const { data: draft, error: draftError } = await db
      .from("drafts")
      .select("rubric, ai_personality, topic, pick_order")
      .eq("id", draftId)
      .single();

    if (draftError || !draft) {
      return Response.json({ error: "ROOM_NOT_FOUND" }, { status: 404 });
    }

    const rubric = (draft.rubric as Record<string, number>) ?? {};
    const personality = (draft.ai_personality as "analyst" | "hype" | "roast") ?? "analyst";
    const topic = (draft.topic as string) ?? "";
    const pickOrder = (draft.pick_order as unknown[]) ?? [];

    // Fetch the latest pick
    const { data: picks, error: picksError } = await db
      .from("picks")
      .select("id, item_id, overall_pick, player_id")
      .eq("draft_id", draftId)
      .order("overall_pick", { ascending: false })
      .limit(1);

    if (picksError || !picks || picks.length === 0) {
      return Response.json({ error: "NO_PICKS" }, { status: 400 });
    }

    const latestPick = picks[0];
    const pickId = latestPick.id as string;
    const overallPick = latestPick.overall_pick as number;
    const itemId = latestPick.item_id as string;
    const playerId = latestPick.player_id as string;

    // Check idempotency
    const idempotencyKey = makeIdempotencyKey(draftId, pickId);
    const { data: existingCommentary } = await db
      .from("commentary")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .single();

    if (existingCommentary) {
      return Response.json({ skipped: true, reason: "already_exists" });
    }

    // Fetch all draft items for score comparison
    const { data: allItems } = await db
      .from("draft_items")
      .select("id, name, hidden_metadata")
      .eq("draft_id", draftId);

    if (!allItems || allItems.length === 0) {
      return Response.json({ error: "NO_ITEMS" }, { status: 400 });
    }

    const pickedItem = allItems.find(
      (item: Record<string, unknown>) => item.id === itemId,
    );

    if (!pickedItem) {
      return Response.json({ error: "ITEM_NOT_FOUND" }, { status: 404 });
    }

    const pickedItemScores = (pickedItem.hidden_metadata as Record<string, number>) ?? {};
    const allItemScores = allItems.map(
      (item: Record<string, unknown>) =>
        (item.hidden_metadata as Record<string, number>) ?? {},
    );

    // Fetch recent picks (including all previous picks) for trend detection
    const { data: recentPicksData } = await db
      .from("picks")
      .select("id, item_id, overall_pick, player_id, draft_id")
      .eq("draft_id", draftId)
      .order("overall_pick", { ascending: true });

    const allPicks = (recentPicksData ?? []) as Array<Record<string, unknown>>;

    // Build recent pick scores (last 2 before this one + this one)
    const currentPickIndex = allPicks.findIndex(
      (p: Record<string, unknown>) => p.id === pickId,
    );
    const recentPicks = allPicks.slice(
      Math.max(0, currentPickIndex - 2),
      currentPickIndex + 1,
    );

    // Get the player's seat for this pick
    const { data: playerData } = await db
      .from("draft_players")
      .select("id, display_name, seat")
      .eq("draft_id", draftId);

    const players = (playerData ?? []) as Array<Record<string, unknown>>;
    const pickPlayer = players.find(
      (p: Record<string, unknown>) => p.id === playerId,
    );
    const playerSeat = (pickPlayer?.seat as number) ?? 0;
    const playerName = (pickPlayer?.display_name as string) ?? "Unknown";

    // Build recent pick scores with seats
    const recentPickScores = recentPicks
      .map((p: Record<string, unknown>) => {
        const item = allItems.find(
          (i: Record<string, unknown>) => i.id === p.item_id,
        );
        const pickPlayerRecord = players.find(
          (pl: Record<string, unknown>) => pl.id === p.player_id,
        );
        return {
          scores: (item?.hidden_metadata as Record<string, number>) ?? {},
          seat: (pickPlayerRecord?.seat as number) ?? 0,
        };
      })
      .filter((p) => Object.keys(p.scores).length > 0);

    // Build seat history (previous picks by the same seat)
    const seatPickScores = allPicks
      .filter(
        (p: Record<string, unknown>) =>
          p.id !== pickId &&
          (p as Record<string, unknown>).player_id === playerId,
      )
      .map((p: Record<string, unknown>) => {
        const item = allItems.find(
          (i: Record<string, unknown>) => i.id === p.item_id,
        );
        return (item?.hidden_metadata as Record<string, number>) ?? {};
      })
      .filter((s) => Object.keys(s).length > 0);

    // Count picks since last commentary
    const { count: commentaryCount } = await db
      .from("commentary")
      .select("*", { count: "exact", head: true })
      .eq("draft_id", draftId);

    const totalCommentary = commentaryCount ?? 0;

    // Picks since last commentary = current overall pick - number of picks that had commentary
    // For simplicity, use overall_pick as a proxy
    const { data: lastCommentary } = await db
      .from("commentary")
      .select("pick_id")
      .eq("draft_id", draftId)
      .order("created_at", { ascending: false })
      .limit(1);

    let picksSinceLastCommentary = 999;
    if (lastCommentary && lastCommentary.length > 0) {
      const lastCommentaryPickId = lastCommentary[0].pick_id as string | null;
      if (lastCommentaryPickId) {
        const { data: lastPick } = await db
          .from("picks")
          .select("overall_pick")
          .eq("id", lastCommentaryPickId)
          .single();
        if (lastPick) {
          const lastPickOverall = (lastPick.overall_pick as number) ?? 0;
          picksSinceLastCommentary = overallPick - lastPickOverall;
        }
      }
    }

    // Run trigger rules
    const triggerResult = evaluateCommentaryTrigger({
      pickedItemScores,
      allItemScores,
      overallPick,
      totalPicks: pickOrder.length,
      rubricWeights: rubric,
      recentPickScores,
      seatPickScores,
      picksSinceLastCommentary,
    });

    if (!triggerResult) {
      return Response.json({ skipped: true, reason: "no_trigger" });
    }

    // Generate AI commentary with retries
    const commentary = await retry(
      () =>
        generateCommentary({
          personality,
          playerName,
          itemName: (pickedItem.name as string) ?? "Unknown",
          tags: triggerResult.tags,
          overallPick,
          totalPicks: pickOrder.length,
          topic,
        }),
      2,
    );

    if (!commentary) {
      return Response.json({ skipped: true, reason: "ai_failed" });
    }

    // Insert commentary with idempotency key
    const { error: insertError } = await db.from("commentary").insert({
      draft_id: draftId,
      pick_id: pickId,
      personality,
      text: commentary.text,
      trigger_tags: triggerResult.tags,
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      prompt_version: "v1",
      idempotency_key: idempotencyKey,
    });

    if (insertError) {
      if (insertError.message?.includes("unique") || insertError.message?.includes("duplicate")) {
        return Response.json({ skipped: true, reason: "already_exists" });
      }
      console.error("[commentary] Insert error:", insertError);
      return Response.json({ error: "INSERT_FAILED" }, { status: 500 });
    }

    return Response.json({
      text: commentary.text,
      tags: triggerResult.tags,
    });
  } catch (e) {
    if (e instanceof AppError) {
      const status = e.code === "UNAUTHORIZED" ? 401 : 400;
      return Response.json({ error: e.code, message: e.message }, { status });
    }
    console.error("[POST /api/ai/commentary]", e);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
