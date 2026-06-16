import { z } from "zod/v4";
import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { handleCommentaryForPick } from "@/features/ai/commentary";

const commentaryRequestSchema = z.object({
  draftId: z.string().uuid(),
});

/**
 * POST /api/ai/commentary
 *
 * Evaluates the most recent pick for commentary triggers and generates AI
 * commentary if warranted. This is designed to be called fire-and-forget
 * after a pick is submitted — the response does not block the caller.
 */
export async function POST(request: Request) {
  try {
    const { guestId } = await requireGuestSession();

    const rateResult = checkRateLimit(
      `commentary:${guestId}`,
      30,
      60 * 1000,
    );

    if (!rateResult.allowed) {
      return Response.json(
        { error: "RATE_LIMITED", message: "Too many requests." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const parseResult = commentaryRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json(
        { error: "INVALID_INPUT", issues: parseResult.error.issues },
        { status: 400 },
      );
    }

    const { draftId } = parseResult.data;

    // Fire-and-forget the commentary generation — don't await
    void handleCommentaryForPick(draftId);

    return Response.json({ accepted: true });
  } catch (e) {
    if (e instanceof AppError) {
      const status = e.code === "UNAUTHORIZED" ? 401 : 400;
      return Response.json({ error: e.code, message: e.message }, { status });
    }
    console.error("[POST /api/ai/commentary]", e);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
