import { z } from "zod";
import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { displayNameSchema } from "@/features/room/schema";
import { joinRoom } from "@/features/room/service";
import { generateRequestId, setRequestIdHeader } from "@/lib/request-id";
import { logRoute } from "@/lib/logger";

const JOIN_RATE_LIMIT_MAX = 30;
const JOIN_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Room code comes from the URL param; body only needs displayName
const joinByCodeBodySchema = z.object({
  displayName: displayNameSchema,
});

/**
 * POST /api/drafts/by-code/[roomCode]/join
 *
 * Joins a draft room by room code. Room code is taken from the URL param;
 * the request body only needs { displayName }.
 *
 * Returns: RoomProjection
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomCode: string }> },
) {
  const requestId = generateRequestId();
  const start = performance.now();

  try {
    const { guestId } = await requireGuestSession();

    const rateResult = checkRateLimit(
      `join:${guestId}`,
      JOIN_RATE_LIMIT_MAX,
      JOIN_RATE_LIMIT_WINDOW_MS,
    );

    if (!rateResult.allowed) {
      const res = Response.json(
        { error: "RATE_LIMITED", message: "Too many join attempts. Try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rateResult.retryAfterMs / 1000)) },
        },
      );
      setRequestIdHeader(res, requestId);
      logRoute({ requestId, action: "join_room", result: "RATE_LIMITED", durationMs: performance.now() - start });
      return res;
    }

    const { roomCode } = await params;
    const body = await request.json();
    const parseResult = joinByCodeBodySchema.safeParse(body);

    if (!parseResult.success) {
      const res = Response.json(
        { error: "INVALID_INPUT", issues: parseResult.error.issues },
        { status: 400 },
      );
      setRequestIdHeader(res, requestId);
      logRoute({ requestId, action: "join_room", result: "INVALID_INPUT", durationMs: performance.now() - start });
      return res;
    }

    const room = await joinRoom(
      roomCode.toUpperCase(),
      parseResult.data.displayName,
      guestId,
    );

    const res = Response.json(room, { status: 200 });
    setRequestIdHeader(res, requestId);
    logRoute({ requestId, action: "join_room", draftId: room.draftId, result: "success", durationMs: performance.now() - start });
    return res;
  } catch (e) {
    if (e instanceof AppError) {
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        ROOM_NOT_FOUND: 404,
        ROOM_FULL: 409,
        NAME_TAKEN: 409,
        INVALID_PHASE: 409,
      };
      const status = statusMap[e.code] ?? 400;
      const res = Response.json({ error: e.code, message: e.message }, { status });
      setRequestIdHeader(res, requestId);
      logRoute({ requestId, action: "join_room", result: e.code, durationMs: performance.now() - start });
      return res;
    }
    console.error("[POST /api/drafts/by-code/:roomCode/join]", e);
    const res = Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
    setRequestIdHeader(res, requestId);
    logRoute({ requestId, action: "join_room", result: "INTERNAL_ERROR", durationMs: performance.now() - start });
    return res;
  }
}
