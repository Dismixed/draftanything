import { z } from "zod/v4";
import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { createAdminClient } from "@/lib/supabase/admin";

const phaseSchema = z.object({
  action: z.enum(["advance"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  try {
    const { guestId } = await requireGuestSession();
    const { draftId } = await params;

    const rateResult = checkRateLimit(
      `phase:${draftId}:${guestId}`,
      10,
      60 * 1000,
    );

    if (!rateResult.allowed) {
      return Response.json(
        { error: "RATE_LIMITED", message: "Too many phase requests." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rateResult.retryAfterMs / 1000)) },
        },
      );
    }

    const body = await request.json();
    const parseResult = phaseSchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json(
        { error: "INVALID_INPUT", issues: parseResult.error.issues },
        { status: 400 },
      );
    }

    if (parseResult.data.action !== "advance") {
      return Response.json(
        { error: "INVALID_INPUT", message: "Only 'advance' action is supported." },
        { status: 400 },
      );
    }

    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db.rpc as any)("advance_phase", {
      p_draft_id: draftId,
      p_guest_id: guestId,
    });

    if (error) {
      const msg = error.message ?? "";
      if (msg.includes("ROOM_NOT_FOUND")) {
        return Response.json({ error: "ROOM_NOT_FOUND", message: "Draft not found" }, { status: 404 });
      }
      if (msg.includes("NOT_HOST")) {
        return Response.json({ error: "UNAUTHORIZED", message: "Only the host can advance phases" }, { status: 403 });
      }
      if (msg.includes("INVALID_PHASE")) {
        return Response.json({ error: "INVALID_PHASE", message: "Cannot advance from current phase" }, { status: 400 });
      }
      if (msg.includes("VOTES_INCOMPLETE")) {
        return Response.json({ error: "VOTES_INCOMPLETE", message: "Not all players have voted yet" }, { status: 400 });
      }
      if (msg.includes("NO_JUDGMENT")) {
        return Response.json({ error: "NO_JUDGMENT", message: "No judgment has been computed yet" }, { status: 400 });
      }
      return Response.json({ error: "INVALID_INPUT", message: msg }, { status: 400 });
    }

    const result = Array.isArray(data) ? data[0] : data;

    return Response.json(result ?? { phase: "COMPLETE" });
  } catch (e) {
    if (e instanceof AppError) {
      const status = e.code === "UNAUTHORIZED" ? 401 : 400;
      return Response.json({ error: e.code, message: e.message }, { status });
    }
    console.error("[POST /api/drafts/:draftId/phase]", e);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
