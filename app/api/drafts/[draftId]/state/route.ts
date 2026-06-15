import { AppError } from "@/lib/errors";
import { getRoom } from "@/features/room/service";

/**
 * GET /api/drafts/[draftId]/state
 *
 * Returns the current safe room projection for polling by the lobby UI.
 * No auth required — room state is not secret during the lobby phase.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ draftId: string }> },
) {
  try {
    const { draftId } = await params;
    const room = await getRoom(draftId);
    return Response.json(room);
  } catch (e) {
    if (e instanceof AppError) {
      const status = e.code === "ROOM_NOT_FOUND" ? 404 : 400;
      return Response.json({ error: e.code, message: e.message }, { status });
    }
    console.error("[GET /api/drafts/:draftId/state]", e);
    return Response.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
