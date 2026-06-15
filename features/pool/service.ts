import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";
import { normalizeItemName } from "./normalize";
import { generatePool } from "@/features/ai/client";
import type { GeneratePoolInput } from "@/features/ai/schemas";

export interface PoolItem {
  id: string;
  name: string;
  normalizedName: string;
  source: "ai" | "manual";
  isAvailable: boolean;
  metadata: Record<string, number>;
}

export interface PoolProjection {
  items: PoolItem[];
  rubric: Record<string, number>;
}

export interface PoolSuggestion {
  id: string;
  playerId: string;
  action: "add" | "remove";
  targetItemId: string | null;
  suggestedName: string | null;
  status: "pending" | "accepted" | "rejected";
}

async function requireHost(draftId: string, guestId: string): Promise<void> {
  const db = createAdminClient();
  const { data: draft } = await db
    .from("drafts")
    .select("host_guest_id, phase")
    .eq("id", draftId)
    .single();

  if (!draft) throw new AppError("ROOM_NOT_FOUND", "Draft not found");
  if (draft.host_guest_id !== guestId) throw new AppError("NOT_HOST", "Only the host can perform this action");
  if (draft.phase !== "POOL_REVIEW") throw new AppError("INVALID_PHASE", "Pool is not in review phase");
}

async function requirePoolPhase(draftId: string): Promise<void> {
  const db = createAdminClient();
  const { data: draft } = await db
    .from("drafts")
    .select("phase")
    .eq("id", draftId)
    .single();

  if (!draft) throw new AppError("ROOM_NOT_FOUND", "Draft not found");
  if (draft.phase !== "POOL_REVIEW") throw new AppError("INVALID_PHASE", "Pool is not in review phase");
}

export async function startPoolReview(draftId: string, guestId: string): Promise<void> {
  const db = createAdminClient();
  const { error } = await db.rpc("start_pool_review", {
    p_draft_id: draftId,
    p_guest_id: guestId,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("ROOM_NOT_FOUND")) throw new AppError("ROOM_NOT_FOUND", "Draft not found");
    if (msg.includes("NOT_HOST")) throw new AppError("NOT_HOST", "Only the host can start pool review");
    if (msg.includes("INVALID_PHASE")) throw new AppError("INVALID_PHASE", "Room is not in lobby phase");
    throw new AppError("INVALID_INPUT", error.message);
  }
}

export async function getPool(draftId: string): Promise<PoolProjection> {
  const db = createAdminClient();

  const { data: draft, error: draftError } = await db
    .from("drafts")
    .select("rubric")
    .eq("id", draftId)
    .single();

  if (draftError || !draft) throw new AppError("ROOM_NOT_FOUND", "Draft not found");

  const { data: items, error: itemsError } = await db
    .from("draft_items")
    .select("*")
    .eq("draft_id", draftId)
    .order("created_at", { ascending: true });

  if (itemsError) throw new AppError("INVALID_INPUT", itemsError.message);

  return {
    rubric: draft.rubric as Record<string, number>,
    items: (items ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      normalizedName: item.normalized_name,
      source: item.source as "ai" | "manual",
      isAvailable: item.is_available,
      metadata: item.hidden_metadata as Record<string, number>,
    })),
  };
}

export async function generateAndAddPoolItems(
  draftId: string,
  guestId: string,
  input: { topic: string; targetCount: number; existingItems: string[] },
): Promise<PoolProjection> {
  await requireHost(draftId, guestId);

  const db = createAdminClient();

  const generationInput: GeneratePoolInput = {
    topic: input.topic,
    targetCount: input.targetCount,
    existingItems: input.existingItems,
  };

  const poolResult = await generatePool(generationInput);

  const { data: draft } = await db
    .from("drafts")
    .select("rubric")
    .eq("id", draftId)
    .single();

  const rubric = poolResult.rubric;

  if (draft) {
    await db.from("drafts").update({ rubric }).eq("id", draftId);
  }

  const normalizedNames = new Set<string>();
  const namesToInsert: Array<{
    draft_id: string;
    name: string;
    normalized_name: string;
    source: "ai";
    hidden_metadata: Record<string, number>;
  }> = [];

  for (const item of poolResult.items) {
    const normalized = normalizeItemName(item.name);
    if (normalizedNames.has(normalized)) continue;
    normalizedNames.add(normalized);
    namesToInsert.push({
      draft_id: draftId,
      name: item.name,
      normalized_name: normalized,
      source: "ai",
      hidden_metadata: item.metadata,
    });
  }

  if (namesToInsert.length > 0) {
    const { error: insertError } = await db.from("draft_items").insert(namesToInsert);
    if (insertError) {
      if (insertError.message?.includes("unique") || insertError.message?.includes("duplicate")) {
        throw new AppError("INVALID_INPUT", "One or more item names already exist in the pool");
      }
      throw new AppError("INVALID_INPUT", insertError.message);
    }
  }

  return getPool(draftId);
}

export async function addItem(
  draftId: string,
  guestId: string,
  name: string,
  rubric: Record<string, number>,
): Promise<PoolProjection> {
  await requireHost(draftId, guestId);

  const normalized = normalizeItemName(name);
  const db = createAdminClient();

  const midpointMetadata: Record<string, number> = {};
  for (const key of Object.keys(rubric)) {
    midpointMetadata[key] = 5;
  }

  const { error: insertError } = await db.from("draft_items").insert({
    draft_id: draftId,
    name,
    normalized_name: normalized,
    source: "manual",
    hidden_metadata: midpointMetadata,
  });

  if (insertError) {
    if (insertError.message?.includes("unique") || insertError.message?.includes("duplicate")) {
      throw new AppError("NAME_TAKEN", `Item "${name}" already exists in the pool`);
    }
    throw new AppError("INVALID_INPUT", insertError.message);
  }

  return getPool(draftId);
}

export async function editItem(
  draftId: string,
  guestId: string,
  itemId: string,
  newName: string,
): Promise<PoolProjection> {
  await requireHost(draftId, guestId);

  const normalized = normalizeItemName(newName);
  const db = createAdminClient();

  const { error } = await db
    .from("draft_items")
    .update({ name: newName, normalized_name: normalized })
    .eq("id", itemId)
    .eq("draft_id", draftId);

  if (error) {
    if (error.message?.includes("unique") || error.message?.includes("duplicate")) {
      throw new AppError("NAME_TAKEN", `Item "${newName}" already exists in the pool`);
    }
    throw new AppError("INVALID_INPUT", error.message);
  }

  return getPool(draftId);
}

export async function removeItem(
  draftId: string,
  guestId: string,
  itemId: string,
): Promise<PoolProjection> {
  await requireHost(draftId, guestId);

  const db = createAdminClient();
  const { error } = await db
    .from("draft_items")
    .delete()
    .eq("id", itemId)
    .eq("draft_id", draftId);

  if (error) throw new AppError("INVALID_INPUT", error.message);

  return getPool(draftId);
}

export async function submitSuggestion(
  draftId: string,
  playerId: string,
  action: "add" | "remove",
  payload: { suggestedName?: string; targetItemId?: string },
): Promise<void> {
  await requirePoolPhase(draftId);

  const db = createAdminClient();

  if (action === "add") {
    if (!payload.suggestedName) throw new AppError("INVALID_INPUT", "suggestedName is required for add suggestions");
    normalizeItemName(payload.suggestedName);
    const { error } = await db.from("pool_suggestions").insert({
      draft_id: draftId,
      player_id: playerId,
      action: "add",
      suggested_name: payload.suggestedName,
    });
    if (error) throw new AppError("INVALID_INPUT", error.message);
  } else {
    if (!payload.targetItemId) throw new AppError("INVALID_INPUT", "targetItemId is required for remove suggestions");
    const { error } = await db.from("pool_suggestions").insert({
      draft_id: draftId,
      player_id: playerId,
      action: "remove",
      target_item_id: payload.targetItemId,
    });
    if (error) throw new AppError("INVALID_INPUT", error.message);
  }
}

export async function getSuggestions(draftId: string): Promise<PoolSuggestion[]> {
  const db = createAdminClient();

  const { data, error } = await db
    .from("pool_suggestions")
    .select("*")
    .eq("draft_id", draftId);

  if (error) throw new AppError("INVALID_INPUT", error.message);

  return (data ?? []).map((s) => ({
    id: s.id,
    playerId: s.player_id,
    action: s.action as "add" | "remove",
    targetItemId: s.target_item_id,
    suggestedName: s.suggested_name,
    status: s.status as "pending" | "accepted" | "rejected",
  }));
}

export async function acceptSuggestion(
  draftId: string,
  guestId: string,
  suggestionId: string,
): Promise<PoolProjection> {
  await requireHost(draftId, guestId);

  const db = createAdminClient();

  const { data: suggestion } = await db
    .from("pool_suggestions")
    .select("*")
    .eq("id", suggestionId)
    .eq("draft_id", draftId)
    .single();

  if (!suggestion) throw new AppError("INVALID_INPUT", "Suggestion not found");
  if (suggestion.status !== "pending") throw new AppError("INVALID_INPUT", "Suggestion is already resolved");

  const now = new Date().toISOString();

  if (suggestion.action === "add" && suggestion.suggested_name) {
    const normalized = normalizeItemName(suggestion.suggested_name);

    const { data: draft } = await db
      .from("drafts")
      .select("rubric")
      .eq("id", draftId)
      .single();

    const rubric = (draft?.rubric ?? {}) as Record<string, number>;
    const midpointMetadata: Record<string, number> = {};
    for (const key of Object.keys(rubric)) {
      midpointMetadata[key] = 5;
    }

    const { error: insertError } = await db.from("draft_items").insert({
      draft_id: draftId,
      name: suggestion.suggested_name,
      normalized_name: normalized,
      source: "manual",
      hidden_metadata: midpointMetadata,
    });

    if (insertError) {
      if (insertError.message?.includes("unique") || insertError.message?.includes("duplicate")) {
        await db
          .from("pool_suggestions")
          .update({ status: "rejected", decided_at: now })
          .eq("id", suggestionId);
        throw new AppError("NAME_TAKEN", "Suggested item already exists in the pool");
      }
      throw new AppError("INVALID_INPUT", insertError.message);
    }
  } else if (suggestion.action === "remove" && suggestion.target_item_id) {
    const { error: deleteError } = await db
      .from("draft_items")
      .delete()
      .eq("id", suggestion.target_item_id)
      .eq("draft_id", draftId);

    if (deleteError) throw new AppError("INVALID_INPUT", deleteError.message);
  }

  await db
    .from("pool_suggestions")
    .update({ status: "accepted", decided_at: now })
    .eq("id", suggestionId);

  return getPool(draftId);
}

export async function rejectSuggestion(
  draftId: string,
  guestId: string,
  suggestionId: string,
): Promise<void> {
  await requireHost(draftId, guestId);

  const db = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await db
    .from("pool_suggestions")
    .update({ status: "rejected", decided_at: now })
    .eq("id", suggestionId)
    .eq("draft_id", draftId)
    .eq("status", "pending");

  if (error) throw new AppError("INVALID_INPUT", error.message);
}

export async function lockPool(draftId: string, guestId: string): Promise<void> {
  const db = createAdminClient();

  const { error } = await db.rpc("lock_pool", {
    p_draft_id: draftId,
    p_guest_id: guestId,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("ROOM_NOT_FOUND")) throw new AppError("ROOM_NOT_FOUND", "Draft not found");
    if (msg.includes("NOT_HOST")) throw new AppError("NOT_HOST", "Only the host can lock the pool");
    if (msg.includes("INVALID_PHASE")) throw new AppError("INVALID_PHASE", "Pool is not in review phase");
    if (msg.includes("INSUFFICIENT_ITEMS")) throw new AppError("INVALID_INPUT", msg);
    throw new AppError("INVALID_INPUT", error.message);
  }
}
