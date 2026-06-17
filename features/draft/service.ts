import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors";
import { buildPickOrder, seededRandom } from "./order";
import type { DraftType } from "./types";

/**
 * Initializes the live draft after the pool has been locked.
 * Computes the pick order from draft settings and calls start_draft.
 */
export async function startDraft(draftId: string, guestId: string): Promise<void> {
  const db = createAdminClient();

  const { data: draft, error: fetchError } = await db
    .from("drafts")
    .select("max_players, rounds, draft_type, phase")
    .eq("id", draftId)
    .single();

  if (fetchError || !draft) {
    throw new AppError("ROOM_NOT_FOUND", "Draft not found");
  }

  if (draft.phase !== "DRAFTING") {
    throw new AppError("INVALID_PHASE", "Draft is not in DRAFTING phase");
  }

  const pickOrder = buildPickOrder(
    draft.max_players,
    draft.rounds,
    draft.draft_type as DraftType,
    seededRandom(draftId),
  );

  const { error } = await db.rpc("start_draft", {
    p_draft_id: draftId,
    p_guest_id: guestId,
    p_pick_order: JSON.parse(JSON.stringify(pickOrder)),
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("ROOM_NOT_FOUND")) {
      throw new AppError("ROOM_NOT_FOUND", "Draft not found");
    }
    if (msg.includes("NOT_HOST")) {
      throw new AppError("NOT_HOST", "Only the host can start the draft");
    }
    if (msg.includes("INVALID_PHASE")) {
      throw new AppError("INVALID_PHASE", "Draft is not in DRAFTING phase");
    }
    throw new AppError("INVALID_INPUT", msg);
  }
}
