import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateRequestId, setRequestIdHeader } from "@/lib/request-id";
import { logRoute } from "@/lib/logger";

/**
 * POST /api/drafts/[draftId]/veto/initiate
 *
 * Challenges the most recent off-the-dome pick and opens a veto vote.
 */
export async function POST(
  _request: Request,
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
      `veto-initiate:${draftId}:${guestId}`,
      10,
      60 * 1000,
    );

    if (!rateResult.allowed) {
      const res = Response.json(
        { error: "RATE_LIMITED", message: "Too many veto attempts." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rateResult.retryAfterMs / 1000)) },
        },
      );
      setRequestIdHeader(res, requestId);
      return res;
    }

    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db.rpc as any)("initiate_veto", {
      p_draft_id: draftId,
      p_guest_id: guestId,
    });

    if (error) {
      const msg = error.message ?? "";
      let errorCode = "INVALID_INPUT";
      let status = 400;

      if (msg.includes("ROOM_NOT_FOUND")) { errorCode = "ROOM_NOT_FOUND"; status = 404; }
      else if (msg.includes("INVALID_PHASE")) { errorCode = "INVALID_PHASE"; status = 400; }
      else if (msg.includes("NOT_A_PLAYER")) { errorCode = "UNAUTHORIZED"; status = 403; }
      else if (msg.includes("PICKER_CANNOT_INITIATE")) { errorCode = "INVALID_INPUT"; status = 400; }
      else if (msg.includes("NO_PICK_TO_VETO")) { errorCode = "INVALID_INPUT"; status = 400; }
      else if (msg.includes("VETO_ALREADY")) { errorCode = "INVALID_INPUT"; status = 409; }
      else if (msg.includes("NO_ELIGIBLE_VOTERS")) { errorCode = "INVALID_INPUT"; status = 400; }

      const res = Response.json({ error: errorCode, message: msg }, { status });
      setRequestIdHeader(res, requestId);
      logRoute({ requestId, action: "initiate_veto", draftId, result: errorCode, durationMs: performance.now() - start });
      return res;
    }

    const result = Array.isArray(data) ? data[0] : data;
    const res = Response.json(result ?? { success: true });
    setRequestIdHeader(res, requestId);
    logRoute({ requestId, action: "initiate_veto", draftId, result: "success", durationMs: performance.now() - start });
    return res;
  } catch (e) {
    if (e instanceof AppError) {
      const status = e.code === "UNAUTHORIZED" ? 401 : 400;
      const res = Response.json({ error: e.code, message: e.message }, { status });
      setRequestIdHeader(res, requestId);
      logRoute({ requestId, action: "initiate_veto", draftId: logDraftId, result: e.code, durationMs: performance.now() - start });
      return res;
    }
    console.error("[POST /api/drafts/:draftId/veto/initiate]", e);
    const res = Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
    setRequestIdHeader(res, requestId);
    logRoute({ requestId, action: "initiate_veto", draftId: logDraftId, result: "INTERNAL_ERROR", durationMs: performance.now() - start });
    return res;
  }
}
