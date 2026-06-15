import { z } from "zod/v4";
import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { createAdminClient } from "@/lib/supabase/admin";

const startDraftSchema = z.object({
  pickOrder: z.array(
    z.object({
      overallPick: z.number().int().positive(),
      round: z.number().int().positive(),
      pickInRound: z.number().int().positive(),
      seat: z.number().int().positive(),
    }),
  ),
});

/**
 * POST /api/drafts/[draftId]/start
 *
 * Initializes the drafting phase after the pool has been locked.
 * Sets the pick order, current_pick_index (0), and first turn_deadline.
 * Only the host can call this.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  try {
    const { guestId } = await requireGuestSession();
    const { draftId } = await params;

    const rateResult = checkRateLimit(
      `start:${draftId}:${guestId}`,
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

    const body = await request.json();
    const parseResult = startDraftSchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json(
        { error: "INVALID_INPUT", issues: parseResult.error.issues },
        { status: 400 },
      );
    }

    const db = createAdminClient();
    const { error } = await db.rpc("start_draft", {
      p_draft_id: draftId,
      p_guest_id: guestId,
      p_pick_order: JSON.parse(JSON.stringify(parseResult.data.pickOrder)),
    });

    if (error) {
      const msg = error.message ?? "";
      if (msg.includes("ROOM_NOT_FOUND")) {
        return Response.json({ error: "ROOM_NOT_FOUND", message: "Draft not found" }, { status: 404 });
      }
      if (msg.includes("NOT_HOST")) {
        return Response.json({ error: "NOT_HOST", message: "Only the host can start the draft" }, { status: 403 });
      }
      if (msg.includes("INVALID_PHASE")) {
        return Response.json({ error: "INVALID_PHASE", message: "Draft is not in DRAFTING phase" }, { status: 400 });
      }
      return Response.json({ error: "INVALID_INPUT", message: msg }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (e) {
    if (e instanceof AppError) {
      const status = e.code === "UNAUTHORIZED" ? 401 : 400;
      return Response.json({ error: e.code, message: e.message }, { status });
    }
    console.error("[POST /api/drafts/:draftId/start]", e);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
