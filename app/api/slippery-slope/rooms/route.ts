import { requireGuestSession } from "@/features/guest/session";
import { handleSsRouteError } from "@/features/slippery-slope/api-errors";
import { createSsRoomSchema } from "@/features/slippery-slope/schema";
import { createSsRoom } from "@/features/slippery-slope/service";
import { checkRateLimit } from "@/lib/rate-limit";

const CREATE_RATE_LIMIT_MAX = 10;
const CREATE_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const { guestId } = await requireGuestSession();

    const rateResult = checkRateLimit(
      `ss-create:${guestId}`,
      CREATE_RATE_LIMIT_MAX,
      CREATE_RATE_LIMIT_WINDOW_MS,
    );
    if (!rateResult.allowed) {
      return Response.json(
        { error: "RATE_LIMITED", message: "Too many rooms created. Try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rateResult.retryAfterMs / 1000)) },
        },
      );
    }

    const body = await request.json();
    const parseResult = createSsRoomSchema.safeParse(body);
    if (!parseResult.success) {
      return Response.json(
        { error: "INVALID_INPUT", issues: parseResult.error.issues },
        { status: 400 },
      );
    }

    const room = await createSsRoom(parseResult.data, guestId);
    return Response.json(room, { status: 201 });
  } catch (e) {
    return handleSsRouteError(e);
  }
}
