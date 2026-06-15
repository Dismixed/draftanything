import { z } from "zod/v4";
import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleCommentaryForPick } from "@/features/ai/commentary";

const pickSchema = z.object({
  itemId: z.string().uuid(),
  expectedPick: z.number().int().min(0),
});

/**
 * POST /api/drafts/[draftId]/pick
 *
 * Submits a pick for the current turn. Validates the player's identity,
 * the expected pick index (for stale detection), and item availability.
 * All game-rule checks happen inside the `submit_pick` RPC.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  try {
    const { guestId } = await requireGuestSession();
    const { draftId } = await params;

    const rateResult = checkRateLimit(
      `pick:${draftId}:${guestId}`,
      20,
      60 * 1000,
    );

    if (!rateResult.allowed) {
      return Response.json(
        { error: "RATE_LIMITED", message: "Too many pick attempts." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rateResult.retryAfterMs / 1000)) },
        },
      );
    }

    const body = await request.json();
    const parseResult = pickSchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json(
        { error: "INVALID_INPUT", issues: parseResult.error.issues },
        { status: 400 },
      );
    }

    const db = createAdminClient();
    const { data, error } = await db.rpc("submit_pick", {
      p_draft_id: draftId,
      p_guest_id: guestId,
      p_item_id: parseResult.data.itemId,
      p_expected_pick: parseResult.data.expectedPick,
    });

    if (error) {
      const msg = error.message ?? "";
      if (msg.includes("ROOM_NOT_FOUND")) {
        return Response.json({ error: "ROOM_NOT_FOUND", message: "Draft not found" }, { status: 404 });
      }
      if (msg.includes("INVALID_PHASE")) {
        return Response.json({ error: "INVALID_PHASE", message: "Draft is not in DRAFTING phase" }, { status: 400 });
      }
      if (msg.includes("STALE_STATE")) {
        return Response.json({ error: "STALE_STATE", message: "Your state is stale. Please refresh." }, { status: 409 });
      }
      if (msg.includes("NOT_YOUR_TURN")) {
        return Response.json({ error: "UNAUTHORIZED", message: "It's not your turn" }, { status: 403 });
      }
      if (msg.includes("ITEM_UNAVAILABLE")) {
        return Response.json({ error: "INVALID_INPUT", message: "This item is no longer available" }, { status: 409 });
      }
      return Response.json({ error: "INVALID_INPUT", message: msg }, { status: 400 });
    }

    const result = Array.isArray(data) ? data[0] : data;

    // Fire-and-forget commentary — pick response never waits for this
    void handleCommentaryForPick(draftId);

    return Response.json(result ?? { success: true });
  } catch (e) {
    if (e instanceof AppError) {
      const status = e.code === "UNAUTHORIZED" ? 401 : 400;
      return Response.json({ error: e.code, message: e.message }, { status });
    }
    console.error("[POST /api/drafts/:draftId/pick]", e);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
