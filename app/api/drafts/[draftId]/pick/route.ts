import { after } from "next/server";
import { z } from "zod/v4";
import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleCommentaryForPick } from "@/features/ai/commentary";
import { generateRequestId, setRequestIdHeader } from "@/lib/request-id";
import { logRoute } from "@/lib/logger";

const poolPickSchema = z.object({
  itemId: z.string().uuid(),
  expectedPick: z.number().int().min(0),
});

const offTheDomePickSchema = z.object({
  itemName: z.string().trim().min(1).max(200),
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
  const requestId = generateRequestId();
  const start = performance.now();
  let logDraftId: string | undefined;

  try {
    const { guestId } = await requireGuestSession();
    const { draftId } = await params;
    logDraftId = draftId;

    const rateResult = checkRateLimit(
      `pick:${draftId}:${guestId}`,
      20,
      60 * 1000,
    );

    if (!rateResult.allowed) {
      const res = Response.json(
        { error: "RATE_LIMITED", message: "Too many pick attempts." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rateResult.retryAfterMs / 1000)) },
        },
      );
      setRequestIdHeader(res, requestId);
      logRoute({ requestId, action: "submit_pick", draftId, result: "RATE_LIMITED", durationMs: performance.now() - start });
      return res;
    }

    const body = await request.json();

    // Fetch draft picking mode to determine which schema to use
    const db = createAdminClient();
    const { data: draftRow, error: draftError } = await db
      .from("drafts")
      .select("picking_mode")
      .eq("id", draftId)
      .single();

    if (draftError || !draftRow) {
      const res = Response.json(
        { error: "ROOM_NOT_FOUND", message: "Draft not found." },
        { status: 404 },
      );
      setRequestIdHeader(res, requestId);
      logRoute({ requestId, action: "submit_pick", draftId, result: "ROOM_NOT_FOUND", durationMs: performance.now() - start });
      return res;
    }

    const isOffTheDome = draftRow.picking_mode === "off_the_dome";
    const parseResult = isOffTheDome
      ? offTheDomePickSchema.safeParse(body)
      : poolPickSchema.safeParse(body);

    if (!parseResult.success) {
      const res = Response.json(
        { error: "INVALID_INPUT", issues: parseResult.error.issues },
        { status: 400 },
      );
      setRequestIdHeader(res, requestId);
      logRoute({ requestId, action: "submit_pick", draftId, result: "INVALID_INPUT", durationMs: performance.now() - start });
      return res;
    }

    const rpcParams = {
      p_draft_id: draftId,
      p_guest_id: guestId,
      p_expected_pick: parseResult.data.expectedPick,
      ...(isOffTheDome
        ? { p_item_name: (parseResult.data as { itemName: string }).itemName }
        : { p_item_id: (parseResult.data as { itemId: string }).itemId }),
    };

    const { data, error } = await db.rpc("submit_pick", rpcParams);

    if (error) {
      const msg = error.message ?? "";
      let errorCode = "INVALID_INPUT";
      let status = 400;

      if (msg.includes("ROOM_NOT_FOUND")) { errorCode = "ROOM_NOT_FOUND"; status = 404; }
      else if (msg.includes("INVALID_PHASE")) { errorCode = "INVALID_PHASE"; status = 400; }
      else if (msg.includes("STALE_STATE")) { errorCode = "STALE_STATE"; status = 409; }
      else if (msg.includes("NOT_YOUR_TURN")) { errorCode = "UNAUTHORIZED"; status = 403; }
      else if (msg.includes("ITEM_UNAVAILABLE")) { errorCode = "INVALID_INPUT"; status = 409; }

      const res = Response.json({ error: errorCode, message: msg }, { status });
      setRequestIdHeader(res, requestId);
      logRoute({ requestId, action: "submit_pick", draftId, result: errorCode, durationMs: performance.now() - start });
      return res;
    }

    const result = Array.isArray(data) ? data[0] : data;
    const phase = (result as { o_phase?: string } | null)?.o_phase;

    if (phase !== "VETO_VOTING") {
      after(() => {
        void handleCommentaryForPick(draftId);
      });
    }

    const res = Response.json(result ?? { success: true });
    setRequestIdHeader(res, requestId);
    logRoute({ requestId, action: "submit_pick", draftId, result: "success", durationMs: performance.now() - start });
    return res;
  } catch (e) {
    if (e instanceof AppError) {
      const status = e.code === "UNAUTHORIZED" ? 401 : 400;
      const res = Response.json({ error: e.code, message: e.message }, { status });
      setRequestIdHeader(res, requestId);
      logRoute({ requestId, action: "submit_pick", draftId: logDraftId, result: e.code, durationMs: performance.now() - start });
      return res;
    }
    console.error("[POST /api/drafts/:draftId/pick]", e);
    const res = Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
    setRequestIdHeader(res, requestId);
    logRoute({ requestId, action: "submit_pick", draftId: logDraftId, result: "INTERNAL_ERROR", durationMs: performance.now() - start });
    return res;
  }
}
