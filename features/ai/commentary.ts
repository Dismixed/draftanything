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

export const commentaryOutputSchema = z.object({
  text: z.string().min(1).max(240),
  tags: z.array(commentaryTagSchema).max(3),
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

/**
 * Evaluates and inserts AI commentary for the latest pick in a draft.
 * Designed to be called fire-and-forget after a pick is submitted.
 * Silently handles all errors — the pick response must never wait for this.
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

    if (draftError || !draft) return;

    const rubric = (draft.rubric as Record<string, number>) ?? {};
    const personality =
      (draft.ai_personality as "analyst" | "hype" | "roast" | "custom") ?? "analyst";
    const topic = (draft.topic as string) ?? "";
    const pickOrder = (draft.pick_order as unknown[]) ?? [];

    const pickSelect =
      "id, item_id, item_name, overall_pick, player_id" as const;

    let latestPick: Record<string, unknown> | null = null;

    if (targetPickId) {
      const { data } = await db
        .from("picks")
        .select(pickSelect)
        .eq("id", targetPickId)
        .eq("draft_id", draftId)
        .single();
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

    if (!latestPick) return;
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
      .single();

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

    if (!itemId) {
      const freeformName = pickItemName ?? "Unknown";
      const tags: string[] = [];
      if (overallPick === 1) tags.push("opening");
      if (tags.length === 0) tags.push("solid");

      const commentary = await retry(
        () =>
          generateCommentary({
            personality,
            playerName,
            itemName: freeformName,
            tags,
            overallPick,
            totalPicks: pickOrder.length,
            topic,
          }),
        2,
      );

      if (!commentary) return;

      await db.from("commentary").insert({
        draft_id: draftId,
        pick_id: pickId,
        personality,
        text: commentary.text,
        trigger_tags: tags,
        model: getGeminiModel(),
        prompt_version: "v1",
        idempotency_key: idempotencyKey,
      });
      return;
    }

    const { data: allItems } = await db
      .from("draft_items")
      .select("id, name, hidden_metadata")
      .eq("draft_id", draftId);

    if (!allItems || allItems.length === 0) return;

    const pickedItem = allItems.find(
      (item: Record<string, unknown>) => item.id === itemId,
    );

    if (!pickedItem) return;

    const pickedItemScores =
      (pickedItem.hidden_metadata as Record<string, number>) ?? {};
    const allItemScores = allItems.map(
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
        const item = allItems.find(
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
        const item = allItems.find(
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
          .single();
        if (lastPick) {
          picksSinceLastCommentary = overallPick - (lastPick.overall_pick as number);
        }
      }
    }

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

    if (!triggerResult) return;

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

    if (!commentary) return;

    await db.from("commentary").insert({
      draft_id: draftId,
      pick_id: pickId,
      personality,
      text: commentary.text,
      trigger_tags: triggerResult.tags,
      model: getGeminiModel(),
      prompt_version: "v1",
      idempotency_key: idempotencyKey,
    });
  } catch (e) {
    console.error("[handleCommentaryForPick] Error:", e);
  }
}
