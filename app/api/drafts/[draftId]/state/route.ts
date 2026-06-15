import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { getRoom } from "@/features/room/service";

const STATE_RATE_LIMIT_MAX = 60;
const STATE_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

/**
 * GET /api/drafts/[draftId]/state
 *
 * Returns the current safe room projection for polling by the lobby UI.
 * Requires an authenticated guest session. Rate limited to 60 req/min per guest.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  try {
    const { guestId } = await requireGuestSession();

    const rateResult = checkRateLimit(
      `state:${guestId}`,
      STATE_RATE_LIMIT_MAX,
      STATE_RATE_LIMIT_WINDOW_MS,
    );

    if (!rateResult.allowed) {
      return Response.json(
        { error: "RATE_LIMITED", message: "Too many requests. Slow down." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rateResult.retryAfterMs / 1000)) },
        },
      );
    }

    const { draftId } = await params;
    const room = await getRoom(draftId);
    return Response.json(room);
  } catch (e) {
    if (e instanceof AppError) {
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        ROOM_NOT_FOUND: 404,
        RATE_LIMITED: 429,
      };
      const status = statusMap[e.code] ?? 400;
      return Response.json({ error: e.code, message: e.message }, { status });
    }
    console.error("[GET /api/drafts/:draftId/state]", e);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
