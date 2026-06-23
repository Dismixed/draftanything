import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { updateConfigSchema } from "@/features/room/schema";
import { updateRoomConfig } from "@/features/room/service";

/**
 * PATCH /api/drafts/[draftId]/config
 *
 * Updates draft configuration while in LOBBY. Host-only.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  try {
    const { guestId } = await requireGuestSession();
    const { draftId } = await params;

    const rateResult = checkRateLimit(
      `config:${draftId}:${guestId}`,
      10,
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

    const body = await request.json();
    const parseResult = updateConfigSchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json(
        { error: "INVALID_INPUT", issues: parseResult.error.issues },
        { status: 400 },
      );
    }

    const projection = await updateRoomConfig(draftId, guestId, parseResult.data);
    return Response.json(projection);
  } catch (e) {
    if (e instanceof AppError) {
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        ROOM_NOT_FOUND: 404,
        NOT_HOST: 403,
        INVALID_PHASE: 400,
        ROOM_FULL: 400,
      };
      const status = statusMap[e.code] ?? 400;
      return Response.json({ error: e.code, message: e.message }, { status });
    }
    console.error("[PATCH /api/drafts/:draftId/config]", e);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
