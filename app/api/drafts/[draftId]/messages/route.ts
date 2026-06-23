import { z } from "zod/v4";
import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { getRoomMessages, sendRoomMessage } from "@/features/chat/service";

const sendMessageSchema = z.object({
  text: z.string().min(1).max(500),
});

/**
 * GET /api/drafts/[draftId]/messages
 *
 * Returns recent room chat messages for the draft.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  try {
    await requireGuestSession();
    const { draftId } = await params;
    const messages = await getRoomMessages(draftId);
    return Response.json(messages);
  } catch (e) {
    if (e instanceof AppError) {
      const status = e.code === "UNAUTHORIZED" ? 401 : 400;
      return Response.json({ error: e.code, message: e.message }, { status });
    }
    console.error("[GET /api/drafts/:draftId/messages]", e);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

/**
 * POST /api/drafts/[draftId]/messages
 *
 * Send a chat message in the room.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  try {
    const { guestId } = await requireGuestSession();
    const { draftId } = await params;

    const rateResult = checkRateLimit(
      `chat:${draftId}:${guestId}`,
      20,
      60 * 1000,
    );

    if (!rateResult.allowed) {
      return Response.json(
        { error: "RATE_LIMITED", message: "Too many messages. Slow down." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rateResult.retryAfterMs / 1000)),
          },
        },
      );
    }

    const body = await request.json();
    const parseResult = sendMessageSchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json(
        { error: "INVALID_INPUT", issues: parseResult.error.issues },
        { status: 400 },
      );
    }

    const message = await sendRoomMessage(
      draftId,
      guestId,
      parseResult.data.text,
    );

    return Response.json(message, { status: 201 });
  } catch (e) {
    if (e instanceof AppError) {
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 403,
        ROOM_NOT_FOUND: 404,
        INVALID_INPUT: 400,
      };
      const status = statusMap[e.code] ?? 400;
      return Response.json({ error: e.code, message: e.message }, { status });
    }
    console.error("[POST /api/drafts/:draftId/messages]", e);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
