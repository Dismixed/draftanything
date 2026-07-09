import { requireGuestSession } from "@/features/guest/session";
import { handleSsRouteError } from "@/features/slippery-slope/api-errors";
import { startSsGame } from "@/features/slippery-slope/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const { guestId } = await requireGuestSession();
    const { roomId } = await params;
    const room = await startSsGame(roomId, guestId);
    return Response.json(room);
  } catch (e) {
    return handleSsRouteError(e);
  }
}
