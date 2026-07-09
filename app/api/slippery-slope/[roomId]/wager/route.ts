import { requireGuestSession } from "@/features/guest/session";
import { handleSsRouteError } from "@/features/slippery-slope/api-errors";
import { submitWagerSchema } from "@/features/slippery-slope/schema";
import { submitSsWager } from "@/features/slippery-slope/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const { guestId } = await requireGuestSession();
    const { roomId } = await params;
    const body = await request.json();
    const parseResult = submitWagerSchema.safeParse(body);
    if (!parseResult.success) {
      return Response.json(
        { error: "INVALID_INPUT", issues: parseResult.error.issues },
        { status: 400 },
      );
    }

    const room = await submitSsWager(
      roomId,
      guestId,
      parseResult.data.wager,
      parseResult.data.turnSeq,
    );
    return Response.json(room);
  } catch (e) {
    return handleSsRouteError(e);
  }
}
