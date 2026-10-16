import { z } from "zod/v4";
import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { addBot, removeBot } from "@/features/bots/service";
import { getPostHogClient, withRequestIdentity } from "@/lib/posthog-server";

const removeBotSchema = z.object({
  playerId: z.string().uuid(),
});

const STATUS: Record<string, number> = {
  UNAUTHORIZED: 401,
  ROOM_NOT_FOUND: 404,
  NOT_HOST: 403,
  ROOM_FULL: 409,
  INVALID_PHASE: 400,
};

function errorResponse(e: unknown, label: string): Response {
  if (e instanceof AppError) {
    return Response.json(
      { error: e.code, message: e.message },
      { status: STATUS[e.code] ?? 400 },
    );
  }
  console.error(`[${label} /api/drafts/:draftId/bots]`, e);
  return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
}

function rateLimited(draftId: string, guestId: string): Response | null {
  const rateResult = checkRateLimit(`bots:${draftId}:${guestId}`, 30, 60 * 1000);
  if (rateResult.allowed) return null;
  return Response.json(
    { error: "RATE_LIMITED", message: "Too many requests." },
    {
      status: 429,
      headers: { "Retry-After": String(Math.ceil(rateResult.retryAfterMs / 1000)) },
    },
  );
}

/**
 * POST /api/drafts/[draftId]/bots
 *
 * Seats an AI drafter in the lowest empty seat. Host only, lobby only.
 * Returns: RoomProjection
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  try {
    const { guestId } = await requireGuestSession();
    const { draftId } = await params;

    const limited = rateLimited(draftId, guestId);
    if (limited) return limited;

    const { room, style } = await addBot(draftId, guestId);

    const posthog = getPostHogClient();
    posthog.capture(withRequestIdentity(request, {
      event: "draft_bot_added",
      properties: { draft_id: draftId, style },
    }, guestId));
    await posthog.flush();

    return Response.json(room);
  } catch (e) {
    return errorResponse(e, "POST");
  }
}

/**
 * DELETE /api/drafts/[draftId]/bots
 *
 * Removes an AI drafter from the lobby. Host only.
 * Body: { playerId }
 * Returns: RoomProjection
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  try {
    const { guestId } = await requireGuestSession();
    const { draftId } = await params;

    const limited = rateLimited(draftId, guestId);
    if (limited) return limited;

    const parseResult = removeBotSchema.safeParse(await request.json());
    if (!parseResult.success) {
      return Response.json(
        { error: "INVALID_INPUT", issues: parseResult.error.issues },
        { status: 400 },
      );
    }

    const room = await removeBot(draftId, guestId, parseResult.data.playerId);

    const posthog = getPostHogClient();
    posthog.capture(withRequestIdentity(request, {
      event: "draft_bot_removed",
      properties: { draft_id: draftId },
    }, guestId));
    await posthog.flush();

    return Response.json(room);
  } catch (e) {
    return errorResponse(e, "DELETE");
  }
}
