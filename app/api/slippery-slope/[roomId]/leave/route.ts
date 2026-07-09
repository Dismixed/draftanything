import { requireGuestSession } from "@/features/guest/session";
import { handleSsRouteError } from "@/features/slippery-slope/api-errors";
import { leaveSsRoom } from "@/features/slippery-slope/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const { guestId } = await requireGuestSession();
    const { roomId } = await params;
    await leaveSsRoom(roomId, guestId);
    return Response.json({ ok: true });
  } catch (e) {
    return handleSsRouteError(e);
  }
}
