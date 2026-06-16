import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { createRoomSchema } from "@/features/room/schema";
import { createRoom } from "@/features/room/service";
import { generateRequestId, setRequestIdHeader } from "@/lib/request-id";
import { logRoute } from "@/lib/logger";

const CREATE_RATE_LIMIT_MAX = 5;
const CREATE_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * POST /api/drafts
 *
 * Creates a new draft room. The calling guest becomes the host and is inserted
 * at seat 1.
 *
 * Body: CreateRoomInput (see features/room/schema.ts)
 * Returns: RoomProjection
 */
export async function POST(request: Request) {
  const requestId = generateRequestId();
  const start = performance.now();

  try {
    const { guestId } = await requireGuestSession();

    // Rate limit: 5 room creations per guest per hour
    const rateResult = checkRateLimit(
      `create:${guestId}`,
      CREATE_RATE_LIMIT_MAX,
      CREATE_RATE_LIMIT_WINDOW_MS,
    );

    if (!rateResult.allowed) {
      const res = Response.json(
        { error: "RATE_LIMITED", message: "Too many rooms created. Try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rateResult.retryAfterMs / 1000)) },
        },
      );
      setRequestIdHeader(res, requestId);
      logRoute({ requestId, action: "create_room", result: "RATE_LIMITED", durationMs: performance.now() - start });
      return res;
    }

    const body = await request.json();
    const parseResult = createRoomSchema.safeParse(body);

    if (!parseResult.success) {
      const res = Response.json(
        { error: "INVALID_INPUT", issues: parseResult.error.issues },
        { status: 400 },
      );
      setRequestIdHeader(res, requestId);
      logRoute({ requestId, action: "create_room", result: "INVALID_INPUT", durationMs: performance.now() - start });
      return res;
    }

    const room = await createRoom(parseResult.data, guestId);
    const res = Response.json(room, { status: 201 });
    setRequestIdHeader(res, requestId);
    logRoute({ requestId, action: "create_room", draftId: room.draftId, result: "success", durationMs: performance.now() - start });
    return res;
  } catch (e) {
    if (e instanceof AppError) {
      const status = e.code === "UNAUTHORIZED" ? 401 : 400;
      const res = Response.json({ error: e.code, message: e.message }, { status });
      setRequestIdHeader(res, requestId);
      logRoute({ requestId, action: "create_room", result: e.code, durationMs: performance.now() - start });
      return res;
    }
    console.error("[POST /api/drafts]", e);
    const res = Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
    setRequestIdHeader(res, requestId);
    logRoute({ requestId, action: "create_room", result: "INTERNAL_ERROR", durationMs: performance.now() - start });
    return res;
  }
}
