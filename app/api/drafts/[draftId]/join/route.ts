import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { joinRoomSchema } from "@/features/room/schema";
import { joinRoom } from "@/features/room/service";

const JOIN_RATE_LIMIT_MAX = 30;
const JOIN_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * POST /api/drafts/[draftId]/join
 *
 * Joins an existing draft room by room code. The draftId param is used for
 * routing context; the room is looked up by roomCode in the body.
 *
 * Body: { displayName: string; roomCode: string }
 * Returns: RoomProjection
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  try {
    const { guestId } = await requireGuestSession();

    // Rate limit: 30 joins per guest per hour
    const rateResult = checkRateLimit(
      `join:${guestId}`,
      JOIN_RATE_LIMIT_MAX,
      JOIN_RATE_LIMIT_WINDOW_MS,
    );

    if (!rateResult.allowed) {
      return Response.json(
        { error: "RATE_LIMITED", message: "Too many join attempts. Try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rateResult.retryAfterMs / 1000)) },
        },
      );
    }

    const body = await request.json();
    const parseResult = joinRoomSchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json(
        { error: "INVALID_INPUT", issues: parseResult.error.issues },
        { status: 400 },
      );
    }

    const { draftId } = await params;
    void draftId; // Present in the URL for RESTful routing; room is found by roomCode

    const room = await joinRoom(
      parseResult.data.roomCode,
      parseResult.data.displayName,
      guestId,
    );

    return Response.json(room, { status: 200 });
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
      return Response.json({ error: e.code, message: e.message }, { status });
    }
    console.error("[POST /api/drafts/:draftId/join]", e);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
