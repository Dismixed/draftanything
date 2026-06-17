import { createAdminClient } from "@/lib/supabase/admin";
import { handleCommentaryForPick } from "@/features/ai/commentary";
import { logRoute } from "@/lib/logger";

/**
 * GET /api/cron/auto-pick
 *
 * Protected cron route invoked by Vercel Cron Jobs (once per minute).
 * Processes due auto-picks for drafts in DRAFTING phase with an expired
 * turn_deadline. Runs in bounded batches of 10 to avoid timeouts.
 *
 * Security: Requires `CRON_SECRET` header matching the `CRON_SECRET`
 * environment variable. In local development, omit the env var to use an
 * empty-string default so the route is testable without configuration.
 */
export async function GET(request: Request) {
  const start = Date.now();

  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const expected = process.env.CRON_SECRET ?? "";
    if (expected && authHeader !== `Bearer ${expected}`) {
      return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const db = createAdminClient();
    const now = new Date().toISOString();

    // Find up to 10 drafts with expired deadlines
    const { data: dueDrafts, error: queryError } = await db
      .from("drafts")
      .select("id, current_pick_index, pick_order, turn_deadline")
      .eq("phase", "DRAFTING")
      .not("turn_deadline", "is", null)
      .lt("turn_deadline", now)
      .limit(10);

    if (queryError) {
      console.error("[cron] query error:", queryError);
      return Response.json({ error: "QUERY_FAILED", message: queryError.message }, { status: 500 });
    }

    if (!dueDrafts || dueDrafts.length === 0) {
      return Response.json({ processed: 0, elapsedMs: Date.now() - start });
    }

    let processed = 0;
    const errors: { draftId: string; error: string }[] = [];

    for (const draft of dueDrafts) {
      try {
        // Determine which seat is currently picking
        const currentPickIndex = draft.current_pick_index;
        const pickOrder = draft.pick_order as { seat: number }[];
        const currentSlot = pickOrder[currentPickIndex];

        if (!currentSlot) {
          errors.push({ draftId: draft.id, error: "INVALID_PICK_INDEX" });
          continue;
        }

        // Find the player at that seat
        const { data: players } = await db
          .from("draft_players")
          .select("guest_id")
          .eq("draft_id", draft.id)
          .eq("seat", currentSlot.seat)
          .limit(1);

        const player = players?.[0];
        if (!player) {
          errors.push({ draftId: draft.id, error: "PLAYER_NOT_FOUND" });
          continue;
        }

        // Call the idempotent auto_pick RPC
        const { error: rpcError } = await db.rpc("auto_pick", {
          p_draft_id: draft.id,
          p_guest_id: player.guest_id,
        });

        if (rpcError) {
          // The RPC may fail for legitimate reasons (item already picked by
          // another concurrent invocation, timer just barely not expired, etc.)
          errors.push({ draftId: draft.id, error: rpcError.message });
          continue;
        }

        const { data: newPick } = await db
          .from("picks")
          .select("id")
          .eq("draft_id", draft.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        void handleCommentaryForPick(draft.id, newPick?.id);

        processed++;
      } catch (e) {
        errors.push({ draftId: draft.id, error: String(e) });
      }
    }

    logRoute({
      requestId: "cron",
      action: "cron-auto-pick",
      result: "success",
      durationMs: Date.now() - start,
    });

    return Response.json({
      processed,
      errors: errors.length > 0 ? errors : undefined,
      elapsedMs: Date.now() - start,
    });
  } catch (e) {
    console.error("[cron] unexpected error:", e);
    return Response.json({ error: "INTERNAL_ERROR", message: String(e) }, { status: 500 });
  }
}
