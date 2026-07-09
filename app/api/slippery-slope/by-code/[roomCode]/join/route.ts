import { requireGuestSession } from "@/features/guest/session";
import { handleSsRouteError } from "@/features/slippery-slope/api-errors";
import { joinSsRoomSchema } from "@/features/slippery-slope/schema";
import { joinSsRoom } from "@/features/slippery-slope/service";
import { checkRateLimit } from "@/lib/rate-limit";

const JOIN_RATE_LIMIT_MAX = 30;
const JOIN_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomCode: string }> },
) {
  try {
    const { guestId } = await requireGuestSession();
    const { roomCode } = await params;

    const rateResult = checkRateLimit(
      `ss-join:${guestId}`,
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
    const parseResult = joinSsRoomSchema.safeParse(body);
    if (!parseResult.success) {
      return Response.json(
        { error: "INVALID_INPUT", issues: parseResult.error.issues },
        { status: 400 },
      );
    }

    const room = await joinSsRoom(roomCode, parseResult.data.displayName, guestId);
    return Response.json(room);
  } catch (e) {
    return handleSsRouteError(e);
  }
}
