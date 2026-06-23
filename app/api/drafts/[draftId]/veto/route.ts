import { after } from "next/server";
import { z } from "zod/v4";
import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleCommentaryForPick } from "@/features/ai/commentary";
import { generateRequestId, setRequestIdHeader } from "@/lib/request-id";
import { logRoute } from "@/lib/logger";

const vetoSchema = z.object({
  wantsVeto: z.boolean(),
});

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
      `veto:${draftId}:${guestId}`,
      20,
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

    const body = await request.json();
    const parseResult = vetoSchema.safeParse(body);

    if (!parseResult.success) {
      const res = Response.json(
        { error: "INVALID_INPUT", issues: parseResult.error.issues },
        { status: 400 },
      );
      setRequestIdHeader(res, requestId);
      return res;
    }

    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db.rpc as any)("submit_veto_vote", {
      p_draft_id: draftId,
      p_guest_id: guestId,
      p_wants_veto: parseResult.data.wantsVeto,
    });

    if (error) {
      const msg = error.message ?? "";
      let errorCode = "INVALID_INPUT";
      let status = 400;

      if (msg.includes("ROOM_NOT_FOUND")) { errorCode = "ROOM_NOT_FOUND"; status = 404; }
      else if (msg.includes("INVALID_PHASE")) { errorCode = "INVALID_PHASE"; status = 400; }
      else if (msg.includes("NOT_A_PLAYER")) { errorCode = "UNAUTHORIZED"; status = 403; }
      else if (msg.includes("PICKER_CANNOT_VOTE")) { errorCode = "INVALID_INPUT"; status = 400; }

      const res = Response.json({ error: errorCode, message: msg }, { status });
      setRequestIdHeader(res, requestId);
      logRoute({ requestId, action: "submit_veto_vote", draftId, result: errorCode, durationMs: performance.now() - start });
      return res;
    }

    const result = Array.isArray(data) ? data[0] : data;
    const confirmedPickId = result?.o_confirmed_pick_id as string | null | undefined;
    const vetoed = result?.o_vetoed === true;
    const phase = result?.o_phase as string | undefined;

    if (!vetoed && confirmedPickId && phase !== "VETO_VOTING") {
      after(() => {
        void handleCommentaryForPick(draftId, confirmedPickId);
      });
    }

    const res = Response.json(result ?? { success: true });
    setRequestIdHeader(res, requestId);
    logRoute({ requestId, action: "submit_veto_vote", draftId, result: "success", durationMs: performance.now() - start });
    return res;
  } catch (e) {
    if (e instanceof AppError) {
      const status = e.code === "UNAUTHORIZED" ? 401 : 400;
      const res = Response.json({ error: e.code, message: e.message }, { status });
      setRequestIdHeader(res, requestId);
      logRoute({ requestId, action: "submit_veto_vote", draftId: logDraftId, result: e.code, durationMs: performance.now() - start });
      return res;
    }
    console.error("[POST /api/drafts/:draftId/veto]", e);
    const res = Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
    setRequestIdHeader(res, requestId);
    logRoute({ requestId, action: "submit_veto_vote", draftId: logDraftId, result: "INTERNAL_ERROR", durationMs: performance.now() - start });
    return res;
  }
}
