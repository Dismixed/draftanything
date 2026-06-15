import { z } from "zod/v4";
import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { judgeRosters } from "@/features/ai/judge";
import type { RubricCategory, RosterPick } from "@/features/ai/fallback";

const judgeSchema = z.object({
  draftId: z.string().uuid(),
});

export async function POST(
  request: Request,
  { params: _params }: { params: Promise<Record<string, string>> },
) {
  void _params;
  try {
    const { guestId } = await requireGuestSession();

    const rateResult = checkRateLimit(
      `judge:${guestId}`,
      5,
      60 * 1000,
    );

    if (!rateResult.allowed) {
      return Response.json(
        { error: "RATE_LIMITED", message: "Too many judge requests." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rateResult.retryAfterMs / 1000)) },
        },
      );
    }

    const body = await request.json();
    const parseResult = judgeSchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json(
        { error: "INVALID_INPUT", issues: parseResult.error.issues },
        { status: 400 },
      );
    }

    const db = createAdminClient();
    const { draftId } = parseResult.data;

    // Fetch draft
    const { data: draft, error: draftError } = await db
      .from("drafts")
      .select("*")
      .eq("id", draftId)
      .single();

    if (draftError || !draft) {
      return Response.json({ error: "ROOM_NOT_FOUND", message: "Draft not found" }, { status: 404 });
    }

    // Only host can trigger judging
    if (draft.host_guest_id !== guestId) {
      return Response.json({ error: "UNAUTHORIZED", message: "Only the host can trigger judging" }, { status: 403 });
    }

    if (draft.phase !== "JUDGING") {
      return Response.json({ error: "INVALID_PHASE", message: "Draft must be in JUDGING phase" }, { status: 400 });
    }

    // Fetch players
    const { data: players } = await db
      .from("draft_players")
      .select("id, guest_id, display_name, seat")
      .eq("draft_id", draftId)
      .is("removed_at", null);

    if (!players || players.length === 0) {
      return Response.json({ error: "INVALID_INPUT", message: "No players found" }, { status: 400 });
    }

    const playerIds = players.map((p) => p.id as string);
    const playerInfo = players.map((p) => ({
      id: p.id as string,
      displayName: p.display_name as string,
    }));

    // Fetch picks with item data
    const { data: picks } = await db
      .from("picks")
      .select("id, player_id, item_id, overall_pick")
      .eq("draft_id", draftId)
      .order("overall_pick", { ascending: true });

    // Fetch items for metadata
    const { data: items } = await db
      .from("draft_items")
      .select("id, name, hidden_metadata")
      .eq("draft_id", draftId);

    const itemMap = new Map((items ?? []).map((i) => [i.id, i]));

    // Build rosters with item names
    const rosters = playerInfo.map((pi) => ({
      playerId: pi.id,
      displayName: pi.displayName,
      picks: (picks ?? [])
        .filter((p) => p.player_id === pi.id)
        .map((p) => {
          const item = itemMap.get(p.item_id as string);
          return {
            itemName: (item?.name as string) ?? "?",
            metadata: (item?.hidden_metadata as Record<string, number>) ?? {},
            overallPick: p.overall_pick as number,
          };
        }),
    }));

    // Build roster picks for fallback
    const rosterPicks: RosterPick[] = (picks ?? []).map((p) => {
      const item = itemMap.get(p.item_id as string);
      return {
        pickId: p.id as string,
        playerId: p.player_id as string,
        itemId: p.item_id as string,
        itemName: (item?.name as string) ?? "?",
        metadata: (item?.hidden_metadata as Record<string, number>) ?? {},
        overallPick: p.overall_pick as number,
      };
    });

    // Fetch defenses
    const { data: defenses } = await db
      .from("arguments")
      .select("player_id, defense_text, skipped")
      .eq("draft_id", draftId);

    // Parse rubric
    const rubricRaw = draft.rubric as Record<string, number> | null;
    const rubric: RubricCategory[] = rubricRaw
      ? Object.entries(rubricRaw).map(([key, weight]) => ({ key, weight }))
      : [];

    const result = await judgeRosters({
      topic: draft.topic as string,
      personality: draft.ai_personality as string,
      rubric,
      rosters,
      defenses: (defenses ?? []).map((d) => ({
        playerId: d.player_id as string,
        defenseText: d.defense_text as string | null,
        skipped: d.skipped as boolean,
      })),
      picks: rosterPicks,
      playerIds,
    });

    // Persist judgment
    const { error: insertError } = await db.from("judgments").insert({
      draft_id: draftId,
      source: result.source,
      player_scores: JSON.stringify(
        Object.fromEntries(
          Object.entries(result.playerScores).map(([pid, s]) => [pid, s.overall]),
        ),
      ),
      ranking: JSON.stringify(result.ranking),
      winner_player_ids: JSON.stringify(result.winnerPlayerIds),
      awards: JSON.stringify(result.awards),
      explanation: result.explanation,
      model: result.model,
      prompt_version: result.promptVersion,
      idempotency_key: result.idempotencyKey,
    });

    if (insertError) {
      return Response.json(
        { error: "INTERNAL_ERROR", message: `Failed to persist judgment: ${insertError.message}` },
        { status: 500 },
      );
    }

    return Response.json({
      source: result.source,
      winnerPlayerIds: result.winnerPlayerIds,
      ranking: result.ranking,
      awards: result.awards,
      explanation: result.explanation,
    });
  } catch (e) {
    if (e instanceof AppError) {
      const status = e.code === "UNAUTHORIZED" ? 401 : 400;
      return Response.json({ error: e.code, message: e.message }, { status });
    }
    console.error("[POST /api/ai/judge]", e);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
