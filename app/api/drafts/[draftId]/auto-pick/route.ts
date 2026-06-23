import { after } from "next/server";
import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { handleCommentaryForPick } from "@/features/ai/commentary";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/drafts/[draftId]/auto-pick
 *
 * Triggers an idempotent auto-pick for the current turn when the timer has
 * expired. The RPC verifies the deadline has passed, selects the first
 * alphabetically available item, and records it. Concurrent calls are safe:
 * the unique constraint on picks(overall_pick) prevents duplicate writes.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  try {
    const { guestId } = await requireGuestSession();
    const { draftId } = await params;

    const rateResult = checkRateLimit(
      `auto-pick:${draftId}:${guestId}`,
      10,
      60 * 1000,
    );

    if (!rateResult.allowed) {
      return Response.json(
        { error: "RATE_LIMITED", message: "Too many requests." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rateResult.retryAfterMs / 1000)) },
        },
      );
    }

    const db = createAdminClient();
    const { data, error } = await db.rpc("auto_pick", {
      p_draft_id: draftId,
      p_guest_id: guestId,
    });

    if (error) {
      const msg = error.message ?? "";
      if (msg.includes("ROOM_NOT_FOUND")) {
        return Response.json({ error: "ROOM_NOT_FOUND", message: "Draft not found" }, { status: 404 });
      }
      if (msg.includes("INVALID_PHASE")) {
        return Response.json({ error: "INVALID_PHASE", message: "Draft is not in DRAFTING phase" }, { status: 400 });
      }
      if (msg.includes("NOT_YOUR_TURN")) {
        return Response.json({ error: "UNAUTHORIZED", message: "It's not your turn" }, { status: 403 });
      }
      if (msg.includes("TIMER_NOT_EXPIRED") || msg.includes("NO_TIMER") || msg.includes("NO_DEADLINE")) {
        return Response.json({ error: "INVALID_INPUT", message: msg }, { status: 400 });
      }
      if (msg.includes("NO_AVAILABLE_ITEMS")) {
        return Response.json({ error: "INSUFFICIENT_ITEMS", message: "No available items to auto-pick" }, { status: 409 });
      }
      return Response.json({ error: "INVALID_INPUT", message: msg }, { status: 400 });
    }

    const result = Array.isArray(data) ? data[0] : data;

    after(() => {
      void handleCommentaryForPick(draftId);
    });

    return Response.json(result ?? { success: true });
  } catch (e) {
    if (e instanceof AppError) {
      const status = e.code === "UNAUTHORIZED" ? 401 : 400;
      return Response.json({ error: e.code, message: e.message }, { status });
    }
    console.error("[POST /api/drafts/:draftId/auto-pick]", e);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
