import { z } from "zod/v4";
import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { getMyPlayerId } from "@/features/room/service";
import { generatePool } from "@/features/ai/pool";


const GENERATE_RATE_LIMIT_MAX = 10;
const GENERATE_RATE_LIMIT_WINDOW_MS = 60 * 1000;

const generatePoolRequestSchema = z.object({
  draftId: z.string().uuid(),
  topic: z.string().min(1).max(200),
  targetCount: z.number().int().min(2).max(60),
  existingItems: z.array(z.string()).default([]),
});

/**
 * POST /api/ai/pool
 *
 * Generates pool items using AI. The caller must be the host of the draft.
 *
 * Body: { draftId: string; topic: string; targetCount: number; existingItems?: string[] }
 * Returns: PoolGenerationResult
 */
export async function POST(request: Request) {
  try {
    const { guestId } = await requireGuestSession();

    const rateResult = checkRateLimit(
      `ai-pool:${guestId}`,
      GENERATE_RATE_LIMIT_MAX,
      GENERATE_RATE_LIMIT_WINDOW_MS,
    );

    if (!rateResult.allowed) {
      return Response.json(
        { error: "RATE_LIMITED", message: "Too many generation requests." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rateResult.retryAfterMs / 1000)) },
        },
      );
    }

    const body = await request.json();
    const parseResult = generatePoolRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json(
        { error: "INVALID_INPUT", issues: parseResult.error.issues },
        { status: 400 },
      );
    }

    const { draftId, ...input } = parseResult.data;

    const myPlayerId = await getMyPlayerId(draftId, guestId);
    if (!myPlayerId) {
      return Response.json(
        { error: "UNAUTHORIZED", message: "You are not a player in this room" },
        { status: 401 },
      );
    }

    const result = await generatePool(input);
    return Response.json(result);
  } catch (e) {
    if (e instanceof AppError) {
      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        RATE_LIMITED: 429,
      };
      const status = statusMap[e.code] ?? 400;
      return Response.json({ error: e.code, message: e.message }, { status });
    }
    console.error("[POST /api/ai/pool]", e);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
