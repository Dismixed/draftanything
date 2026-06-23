import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { leaveRoom } from "@/features/room/service";

/**
 * POST /api/drafts/[draftId]/leave
 *
 * Soft-removes the current player from a LOBBY-phase draft.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  try {
    const { guestId } = await requireGuestSession();
    const { draftId } = await params;

    const rateResult = checkRateLimit(
      `leave:${draftId}:${guestId}`,
      30,
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

    await leaveRoom(draftId, guestId);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof AppError) {
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        ROOM_NOT_FOUND: 404,
        INVALID_PHASE: 400,
      };
      const status = statusMap[e.code] ?? 400;
      return Response.json({ error: e.code, message: e.message }, { status });
    }
    console.error("[POST /api/drafts/:draftId/leave]", e);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
