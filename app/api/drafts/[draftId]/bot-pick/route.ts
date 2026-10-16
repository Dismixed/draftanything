import { after } from "next/server";
import { z } from "zod/v4";
import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { getMyPlayerId } from "@/features/room/service";
import { makeBotPick } from "@/features/bots/service";
import { handleCommentaryForPick } from "@/features/ai/commentary";
import { generateRequestId, setRequestIdHeader } from "@/lib/request-id";
import { logRoute } from "@/lib/logger";
import { getPostHogClient, withRequestIdentity } from "@/lib/posthog-server";

const botPickSchema = z.object({
  expectedPick: z.number().int().min(0),
});

/**
 * POST /api/drafts/[draftId]/bot-pick
 *
 * Asks the server to make the pick for the AI drafter on the clock. Nothing
 * runs on a schedule: the browsers of the people in the room call this when
 * they see an AI drafter's turn. Any player may call it; the server decides
 * the pick, and only one request per turn takes effect.
 *
 * Body: { expectedPick }
 * Returns: { status: "picked" | "stale" }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const requestId = generateRequestId();
  const start = performance.now();
  let logDraftId: string | undefined;

  const respond = (body: unknown, status: number, result: string): Response => {
    const res = Response.json(body, { status });
    setRequestIdHeader(res, requestId);
    logRoute({
      requestId,
      action: "bot_pick",
      draftId: logDraftId,
      result,
      durationMs: performance.now() - start,
    });
    return res;
  };

  try {
    const { guestId } = await requireGuestSession();
    const { draftId } = await params;
    logDraftId = draftId;

    const rateResult = checkRateLimit(`botpick:${draftId}:${guestId}`, 120, 60 * 1000);
    if (!rateResult.allowed) {
      const res = respond(
        { error: "RATE_LIMITED", message: "Too many requests." },
        429,
        "RATE_LIMITED",
      );
      res.headers.set("Retry-After", String(Math.ceil(rateResult.retryAfterMs / 1000)));
      return res;
    }

    if (!(await getMyPlayerId(draftId, guestId))) {
      return respond(
        { error: "UNAUTHORIZED", message: "You are not a player in this room" },
        401,
        "UNAUTHORIZED",
      );
    }

    const parseResult = botPickSchema.safeParse(await request.json());
    if (!parseResult.success) {
      return respond(
        { error: "INVALID_INPUT", issues: parseResult.error.issues },
        400,
        "INVALID_INPUT",
      );
    }

    const outcome = await makeBotPick(draftId, parseResult.data.expectedPick);

    if (outcome.status === "picked") {
      after(() => {
        void handleCommentaryForPick(draftId);
      });

      const posthog = getPostHogClient();
      posthog.capture(withRequestIdentity(request, {
        event: "draft_bot_pick",
        properties: {
          draft_id: draftId,
          style: outcome.style,
          picking_mode: outcome.pickingMode,
          forfeited: outcome.forfeited,
        },
      }, guestId));
      await posthog.flush();
    }

    return respond({ status: outcome.status }, 200, outcome.status);
  } catch (e) {
    if (e instanceof AppError) {
      const status =
        e.code === "UNAUTHORIZED" ? 401 : e.code === "ROOM_NOT_FOUND" ? 404 : 400;
      return respond({ error: e.code, message: e.message }, status, e.code);
    }
    console.error("[POST /api/drafts/:draftId/bot-pick]", e);
    return respond({ error: "INTERNAL_ERROR" }, 500, "INTERNAL_ERROR");
  }
}
