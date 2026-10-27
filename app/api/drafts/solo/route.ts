import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { soloRoomSchema } from "@/features/room/schema";
import { createSoloRoom } from "@/features/bots/solo";
import { captureDraftEvent } from "@/features/draft/events";
import { generateRequestId, setRequestIdHeader } from "@/lib/request-id";
import { logRoute } from "@/lib/logger";
import { getPostHogClient, withRequestIdentity } from "@/lib/posthog-server";

// Shared with POST /api/drafts: a solo draft is still a room.
const CREATE_RATE_LIMIT_MAX = 5;
const CREATE_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * POST /api/drafts/solo
 *
 * Creates a draft for one person against AI drafters and skips the waiting
 * lobby. The response's phase is POOL_REVIEW (pool draft) or DRAFTING
 * (off-the-dome).
 *
 * Body: SoloRoomInput (see features/room/schema.ts)
 * Returns: RoomProjection
 */
export async function POST(request: Request) {
  const requestId = generateRequestId();
  const start = performance.now();

  const respond = (
    body: unknown,
    status: number,
    result: string,
    draftId?: string,
  ): Response => {
    const res = Response.json(body, { status });
    setRequestIdHeader(res, requestId);
    logRoute({
      requestId,
      action: "create_solo_room",
      draftId,
      result,
      durationMs: performance.now() - start,
    });
    return res;
  };

  try {
    const { guestId } = await requireGuestSession();

    const rateResult = checkRateLimit(
      `create:${guestId}`,
      CREATE_RATE_LIMIT_MAX,
      CREATE_RATE_LIMIT_WINDOW_MS,
    );

    if (!rateResult.allowed) {
      const res = respond(
        { error: "RATE_LIMITED", message: "Too many rooms created. Try again later." },
        429,
        "RATE_LIMITED",
      );
      res.headers.set("Retry-After", String(Math.ceil(rateResult.retryAfterMs / 1000)));
      return res;
    }

    const parseResult = soloRoomSchema.safeParse(await request.json());
    if (!parseResult.success) {
      return respond(
        { error: "INVALID_INPUT", issues: parseResult.error.issues },
        400,
        "INVALID_INPUT",
      );
    }

    const room = await createSoloRoom(parseResult.data, guestId);

    const posthog = getPostHogClient();
    posthog.capture(withRequestIdentity(request, {
      event: "draft_solo_started",
      properties: {
        draft_id: room.draftId,
        opponents: parseResult.data.opponents,
        picking_mode: parseResult.data.pickingMode,
        rounds: parseResult.data.rounds,
      },
    }, guestId));
    await posthog.flush();
    // Off-the-dome skips pool review, so the draft is already live. A pool draft starts on lock.
    if (room.phase === "DRAFTING") await captureDraftEvent(request, "draft_started", room, guestId);

    return respond(room, 201, "success", room.draftId);
  } catch (e) {
    if (e instanceof AppError) {
      return respond(
        { error: e.code, message: e.message },
        e.code === "UNAUTHORIZED" ? 401 : 400,
        e.code,
      );
    }
    console.error("[POST /api/drafts/solo]", e);
    return respond({ error: "INTERNAL_ERROR" }, 500, "INTERNAL_ERROR");
  }
}
