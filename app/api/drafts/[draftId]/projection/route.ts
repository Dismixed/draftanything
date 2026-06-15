import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { getDraftRoomProjection } from "@/features/draft/projection";

const STATE_RATE_LIMIT_MAX = 60;
const STATE_RATE_LIMIT_WINDOW_MS = 60 * 1000;

/**
 * GET /api/drafts/[draftId]/projection
 *
 * Returns the full drafting room projection including available items, picks,
 * commentary, and server timestamp. Used by the draft board client components.
 * Rate limited to 60 req/min per guest.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  try {
    const { guestId } = await requireGuestSession();

    const rateResult = checkRateLimit(
      `projection:${guestId}`,
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
    const projection = await getDraftRoomProjection(draftId);
    return Response.json(projection);
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
    console.error("[GET /api/drafts/:draftId/projection]", e);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
