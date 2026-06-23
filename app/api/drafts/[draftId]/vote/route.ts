import { z } from "zod/v4";
import { AppError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireGuestSession } from "@/features/guest/session";
import { createAdminClient } from "@/lib/supabase/admin";


const voteSchema = z.object({
  selectedPlayerId: z.string().uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  try {
    const { guestId } = await requireGuestSession();
    const { draftId } = await params;

    const rateResult = checkRateLimit(
      `vote:${draftId}:${guestId}`,
      10,
      60 * 1000,
    );

    if (!rateResult.allowed) {
      return Response.json(
        { error: "RATE_LIMITED", message: "Too many vote attempts." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rateResult.retryAfterMs / 1000)) },
        },
      );
    }

    const body = await request.json();
    const parseResult = voteSchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json(
        { error: "INVALID_INPUT", issues: parseResult.error.issues },
        { status: 400 },
      );
    }

    const db = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db.rpc as any)("submit_vote", {
      p_draft_id: draftId,
      p_guest_id: guestId,
      p_selected_player_id: parseResult.data.selectedPlayerId,
    });

    if (error) {
      const msg = error.message ?? "";
      if (msg.includes("ROOM_NOT_FOUND")) {
        return Response.json({ error: "ROOM_NOT_FOUND", message: "Draft not found" }, { status: 404 });
      }
      if (msg.includes("INVALID_PHASE")) {
        return Response.json({ error: "INVALID_PHASE", message: "Draft is not in VOTING phase" }, { status: 400 });
      }
      if (msg.includes("NOT_A_PLAYER")) {
        return Response.json({ error: "UNAUTHORIZED", message: "You are not a player in this draft" }, { status: 403 });
      }
      if (msg.includes("SELF_VOTE")) {
        return Response.json({ error: "INVALID_INPUT", message: "You cannot vote for yourself" }, { status: 400 });
      }
      return Response.json({ error: "INVALID_INPUT", message: msg }, { status: 400 });
    }

    const { data: draft, error: phaseError } = await db
      .from("drafts")
      .select("phase")
      .eq("id", draftId)
      .single();

    if (phaseError) {
      return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
    }

    return Response.json({ success: true, phase: draft.phase });
  } catch (e) {
    if (e instanceof AppError) {
      const status = e.code === "UNAUTHORIZED" ? 401 : 400;
      return Response.json({ error: e.code, message: e.message }, { status });
    }
    console.error("[POST /api/drafts/:draftId/vote]", e);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
