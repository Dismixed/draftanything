import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { suggestTopics } from "@/features/ai/topics";

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

/**
 * POST /api/ai/topics
 *
 * Generates draft topic suggestions using AI.
 *
 * Body: { interests?: string, exclude?: string[] }
 * Returns: { topics: string[] }
 */
export async function POST(request: Request) {
  try {
    const { guestId } = await requireGuestSession();

    const rateResult = checkRateLimit(
      `ai-topics:${guestId}`,
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW_MS,
    );

    if (!rateResult.allowed) {
      return Response.json(
        { error: "RATE_LIMITED", message: "Too many requests. Please wait." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rateResult.retryAfterMs / 1000)) },
        },
      );
    }

    let interests: string | undefined;
    let exclude: string[] | undefined;

    try {
      const body = await request.json();
      if (typeof body.interests === "string" && body.interests.trim()) {
        interests = body.interests.trim().slice(0, 200);
      }
      if (Array.isArray(body.exclude)) {
        exclude = body.exclude.filter((t: unknown) => typeof t === "string").slice(0, 50);
      }
    } catch {
      // No body or invalid JSON — use defaults
    }

    const topics = await suggestTopics({ interests, exclude });
    return Response.json({ topics });
  } catch (e) {
    if (e instanceof AppError) {
      return Response.json({ error: e.code, message: e.message }, { status: 401 });
    }
    console.error("[POST /api/ai/topics]", e);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
