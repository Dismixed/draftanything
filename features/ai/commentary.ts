import "server-only";

import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildCommentaryPrompt } from "./prompts/commentary";
import { evaluateCommentaryTrigger } from "./commentary-trigger";
import { generateJson, getGeminiModel } from "./gemini";

export const COMMENTARY_PROMPT_VERSION = "v1";

export const commentaryTagSchema = z.enum([
  "reach",
  "steal",
  "trend",
  "run",
  "surprise",
  "solid",
  "roundup",
  "opening",
]);

/** Gemini only returns the line — tags are chosen server-side. */
export const commentaryOutputSchema = z.object({
  text: z.string().min(1).max(240),
});

export type CommentaryOutput = z.infer<typeof commentaryOutputSchema>;

export function makeIdempotencyKey(
  draftId: string,
  pickId: string,
): string {
  return `commentary:${draftId}:${pickId}:${COMMENTARY_PROMPT_VERSION}`;
}

export interface GenerateCommentaryInput {
  personality: string;
  playerName: string;
  itemName: string;
  tags: string[];
  overallPick: number;
  totalPicks: number;
  topic: string;
}

export async function generateCommentary(
  input: GenerateCommentaryInput,
): Promise<CommentaryOutput> {
  const prompt = buildCommentaryPrompt(input);

  return generateJson({
    systemPrompt: prompt.system,
    userPrompt: prompt.user,
    schema: commentaryOutputSchema,
    schemaName: "commentary_output",
    maxOutputTokens: 512,
  });
}

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
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, attempt)),
      );
    }
  }
  return null;
}

function defaultTags(overallPick: number): string[] {
  return overallPick === 1 ? ["opening"] : ["roundup"];
}

/**
 * Evaluates and inserts AI commentary for a pick.
 * Designed to be called fire-and-forget after a pick is submitted.
 */
export async function handleCommentaryForPick(
  draftId: string,
  targetPickId?: string,
): Promise<void> {
  try {
    const db = createAdminClient();

    const { data: draft, error: draftError } = await db
      .from("drafts")
      .select("rubric, ai_personality, topic, pick_order")
      .eq("id", draftId)
      .single();

    if (draftError || !draft) {
      console.error("[commentary] draft not found:", draftId, draftError);
      return;
    }

    const rubric = (draft.rubric as Record<string, number>) ?? {};
    const personality =
      (draft.ai_personality as "analyst" | "hype" | "roast" | "custom") ?? "analyst";
    const topic = (draft.topic as string) ?? "";
    const pickOrder = (draft.pick_order as unknown[]) ?? [];

    const pickSelect =
      "id, item_id, item_name, overall_pick, player_id" as const;

    let latestPick: Record<string, unknown> | null = null;

    if (targetPickId) {
      const { data, error } = await db
        .from("picks")
        .select(pickSelect)
        .eq("id", targetPickId)
        .eq("draft_id", draftId)
        .maybeSingle();
      if (error) {
        console.error("[commentary] pick lookup failed:", targetPickId, error);
      }
      latestPick = data as Record<string, unknown> | null;
    } else {
      const { data: picks } = await db
        .from("picks")
        .select(pickSelect)
        .eq("draft_id", draftId)
        .order("overall_pick", { ascending: false })
        .limit(1);
      latestPick = (picks?.[0] as Record<string, unknown> | undefined) ?? null;
    }

    if (!latestPick) {
      console.error("[commentary] no pick found for draft:", draftId, targetPickId);
      return;
    }

    const pickId = latestPick.id as string;
    const overallPick = latestPick.overall_pick as number;
    const itemId = latestPick.item_id as string | null;
    const pickItemName = latestPick.item_name as string | null;
    const playerId = latestPick.player_id as string;

    const idempotencyKey = makeIdempotencyKey(draftId, pickId);
    const { data: existingCommentary } = await db
      .from("commentary")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingCommentary) return;

    const { data: playerData } = await db
      .from("draft_players")
      .select("id, display_name, seat")
      .eq("draft_id", draftId);

    const players = (playerData ?? []) as Array<Record<string, unknown>>;
    const pickPlayer = players.find(
      (p: Record<string, unknown>) => p.id === playerId,
    );
    const playerName = (pickPlayer?.display_name as string) ?? "Unknown";

    let itemName: string;
    let tags: string[];

    if (!itemId) {
      itemName = pickItemName ?? "Unknown";
      tags = defaultTags(overallPick);
      if (tags[0] !== "opening") tags = ["solid"];
    } else {
      const { data: allItems } = await db
        .from("draft_items")
        .select("id, name, hidden_metadata")
        .eq("draft_id", draftId);

      const pickedItem = allItems?.find(
        (item: Record<string, unknown>) => item.id === itemId,
      );

      if (!pickedItem) {
        console.error("[commentary] item not found for pick:", pickId, itemId);
        return;
      }

      itemName = (pickedItem.name as string) ?? "Unknown";

      const pickedItemScores =
        (pickedItem.hidden_metadata as Record<string, number>) ?? {};
      const allItemScores = (allItems ?? []).map(
        (item: Record<string, unknown>) =>
          (item.hidden_metadata as Record<string, number>) ?? {},
      );

      const { data: recentPicksData } = await db
        .from("picks")
        .select("id, item_id, overall_pick, player_id")
        .eq("draft_id", draftId)
        .order("overall_pick", { ascending: true });

      const allPicks = (recentPicksData ?? []) as Array<Record<string, unknown>>;

      const currentPickIndex = allPicks.findIndex(
        (p: Record<string, unknown>) => p.id === pickId,
      );
      const recentPicks = allPicks.slice(
        Math.max(0, currentPickIndex - 2),
        currentPickIndex + 1,
      );

      const recentPickScores = recentPicks
        .map((p: Record<string, unknown>) => {
          const item = allItems?.find(
            (i: Record<string, unknown>) => i.id === p.item_id,
          );
          const pp = players.find(
            (pl: Record<string, unknown>) => pl.id === p.player_id,
          );
          return {
            scores: (item?.hidden_metadata as Record<string, number>) ?? {},
            seat: (pp?.seat as number) ?? 0,
          };
        })
        .filter((p) => Object.keys(p.scores).length > 0);

      const seatPickScores = allPicks
        .filter(
          (p: Record<string, unknown>) =>
            p.id !== pickId &&
            (p as Record<string, unknown>).player_id === playerId,
        )
        .map((p: Record<string, unknown>) => {
          const item = allItems?.find(
            (i: Record<string, unknown>) => i.id === p.item_id,
          );
          return (item?.hidden_metadata as Record<string, number>) ?? {};
        })
        .filter((s) => Object.keys(s).length > 0);

      const { data: lastCommentary } = await db
        .from("commentary")
        .select("pick_id")
        .eq("draft_id", draftId)
        .order("created_at", { ascending: false })
        .limit(1);

      let picksSinceLastCommentary = 999;
      if (lastCommentary && lastCommentary.length > 0) {
        const lastPickId = lastCommentary[0].pick_id as string | null;
        if (lastPickId) {
          const { data: lastPick } = await db
            .from("picks")
            .select("overall_pick")
            .eq("id", lastPickId)
            .maybeSingle();
          if (lastPick) {
            picksSinceLastCommentary =
              overallPick - (lastPick.overall_pick as number);
          }
        }
      }

      const triggerResult =
        Object.keys(pickedItemScores).length > 0
          ? evaluateCommentaryTrigger({
              pickedItemScores,
              allItemScores,
              overallPick,
              totalPicks: pickOrder.length,
              rubricWeights: rubric,
              recentPickScores,
              seatPickScores,
              picksSinceLastCommentary,
            })
          : null;

      tags = triggerResult?.tags ?? defaultTags(overallPick);
    }

    const commentary = await retry(
      () =>
        generateCommentary({
          personality,
          playerName,
          itemName,
          tags,
          overallPick,
          totalPicks: pickOrder.length,
          topic,
        }),
      2,
    );

    if (!commentary) {
      console.error("[commentary] generation failed for pick:", pickId);
      return;
    }

    const { error: insertError } = await db.from("commentary").insert({
      draft_id: draftId,
      pick_id: pickId,
      personality,
      text: commentary.text,
      trigger_tags: tags,
      model: getGeminiModel(),
      prompt_version: COMMENTARY_PROMPT_VERSION,
      idempotency_key: idempotencyKey,
    });

    if (insertError) {
      console.error("[commentary] insert failed:", insertError);
    }
  } catch (e) {
    console.error("[handleCommentaryForPick] Error:", e);
  }
}
