import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/drafts/[draftId]/start-defense
 *
 * Transitions from DRAFT_COMPLETE to DEFENSE after all picks are in.
 * Only the host can call this.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  try {
    const { guestId } = await requireGuestSession();
    const { draftId } = await params;

    const rateResult = checkRateLimit(
      `start-defense:${draftId}:${guestId}`,
      5,
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
    const { error } = await db.rpc("start_defense", {
      p_draft_id: draftId,
      p_guest_id: guestId,
    });

    if (error) {
      const msg = error.message ?? "";
      if (msg.includes("ROOM_NOT_FOUND")) {
        return Response.json({ error: "ROOM_NOT_FOUND", message: "Draft not found" }, { status: 404 });
      }
      if (msg.includes("NOT_HOST")) {
        return Response.json({ error: "NOT_HOST", message: "Only the host can start defense" }, { status: 403 });
      }
      if (msg.includes("INVALID_PHASE")) {
        return Response.json({ error: "INVALID_PHASE", message: "Draft is not ready for defense" }, { status: 400 });
      }
      return Response.json({ error: "INVALID_INPUT", message: msg }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (e) {
    if (e instanceof AppError) {
      const status = e.code === "UNAUTHORIZED" ? 401 : 400;
      return Response.json({ error: e.code, message: e.message }, { status });
    }
    console.error("[POST /api/drafts/:draftId/start-defense]", e);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
