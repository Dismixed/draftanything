import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildCommentaryPrompt } from "./prompts/commentary";
import { evaluateCommentaryTrigger } from "./commentary-trigger";

export const COMMENTARY_PROMPT_VERSION = "v1";

const MODEL = process.env.OPENAI_MODEL || "gpt-5.5";
const TIMEOUT_MS = 60_000;

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

export const commentaryTagSchema = z.enum([
  "reach",
  "steal",
  "trend",
  "run",
  "surprise",
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
  const client = getClient();
  const prompt = buildCommentaryPrompt(input);

  const response = await client.responses.create(
    {
      model: MODEL,
      input: [
        { role: "system", content: [{ type: "input_text", text: prompt.system }] },
        { role: "user", content: [{ type: "input_text", text: prompt.user }] },
      ],
      text: { format: zodTextFormat(commentaryOutputSchema, "commentary_output") },
      reasoning: { effort: "low" },
      max_output_tokens: 512,
    },
    { signal: AbortSignal.timeout(TIMEOUT_MS) },
  );

  const raw = response.output_text;
  if (!raw) {
    throw new Error("AI returned empty response");
  }

  let parsedResult: unknown;
  try {
    parsedResult = JSON.parse(raw);
  } catch {
    throw new Error("AI returned invalid JSON");
  }

  const validation = commentaryOutputSchema.safeParse(parsedResult);
  if (!validation.success) {
    throw new Error(`AI response failed validation: ${validation.error.message}`);
  }

  return validation.data;
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
    const personality = (draft.ai_personality as "analyst" | "hype" | "roast") ?? "analyst";
    const topic = (draft.topic as string) ?? "";
    const pickOrder = (draft.pick_order as unknown[]) ?? [];

    const { data: picks } = await db
      .from("picks")
      .select("id, item_id, overall_pick, player_id")
      .eq("draft_id", draftId)
      .order("overall_pick", { ascending: false })
      .limit(1);

    if (!picks || picks.length === 0) return;

    const latestPick = picks[0];
    const pickId = latestPick.id as string;
    const overallPick = latestPick.overall_pick as number;
    const itemId = latestPick.item_id as string;
    const playerId = latestPick.player_id as string;

    const idempotencyKey = makeIdempotencyKey(draftId, pickId);
    const { data: existingCommentary } = await db
      .from("commentary")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .single();

    if (existingCommentary) return;

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

    const { data: playerData } = await db
      .from("draft_players")
      .select("id, display_name, seat")
      .eq("draft_id", draftId);

    const players = (playerData ?? []) as Array<Record<string, unknown>>;
    const pickPlayer = players.find(
      (p: Record<string, unknown>) => p.id === playerId,
    );
    const playerName = (pickPlayer?.display_name as string) ?? "Unknown";

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
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      prompt_version: "v1",
      idempotency_key: idempotencyKey,
    });
  } catch (e) {
    console.error("[handleCommentaryForPick] Error:", e);
  }
}
