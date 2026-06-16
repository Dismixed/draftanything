import { z } from "zod/v4";
import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { judgeDraft, persistJudgment, getJudgingData } from "@/features/judging/service";

const judgeSchema = z.object({
  draftId: z.string().uuid(),
});

export async function POST(
  request: Request,
  { params: _params }: { params: Promise<Record<string, string>> },
) {
  void _params;
  try {
    const { guestId } = await requireGuestSession();

    const rateResult = checkRateLimit(
      `judge:${guestId}`,
      5,
      60 * 1000,
    );

    if (!rateResult.allowed) {
      return Response.json(
        { error: "RATE_LIMITED", message: "Too many judge requests." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rateResult.retryAfterMs / 1000)) },
        },
      );
    }

    const body = await request.json();
    const parseResult = judgeSchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json(
        { error: "INVALID_INPUT", issues: parseResult.error.issues },
        { status: 400 },
      );
    }

    const { draftId } = parseResult.data;

    const judgingData = await getJudgingData(draftId);

    // Only host can trigger judging
    if (judgingData.hostGuestId !== guestId) {
      return Response.json({ error: "UNAUTHORIZED", message: "Only the host can trigger judging" }, { status: 403 });
    }

    if (judgingData.phase !== "JUDGING") {
      return Response.json({ error: "INVALID_PHASE", message: "Draft must be in JUDGING phase" }, { status: 400 });
    }

    const judgment = await judgeDraft(
      draftId,
      judgingData.topic,
      judgingData.judgingMode,
      judgingData.aiPersonality,
      judgingData.rubric,
      judgingData.safePlayers,
      judgingData.safePicks,
      judgingData.rosters,
      judgingData.voteRecords,
    );

    await persistJudgment(judgment);

    return Response.json({
      source: judgment.source,
      winnerPlayerIds: judgment.winnerPlayerIds,
      ranking: judgment.ranking,
      awards: judgment.awards,
      explanation: judgment.explanation,
    });
  } catch (e) {
    if (e instanceof AppError) {
      const status = e.code === "UNAUTHORIZED" ? 401 : 400;
      return Response.json({ error: e.code, message: e.message }, { status });
    }
    console.error("[POST /api/ai/judge]", e);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
