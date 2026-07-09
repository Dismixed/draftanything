import { requireGuestSession } from "@/features/guest/session";
import { handleSsRouteError } from "@/features/slippery-slope/api-errors";
import { updateSsPlayerEmojiSchema } from "@/features/slippery-slope/schema";
import { updateSsPlayerEmoji } from "@/features/slippery-slope/service";
import { PLAYER_EMOJIS } from "@/components/slippery-slope/data";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const { guestId } = await requireGuestSession();
    const { roomId } = await params;
    const body = await request.json();
    const parseResult = updateSsPlayerEmojiSchema.safeParse(body);
    if (!parseResult.success) {
      return Response.json(
        { error: "INVALID_INPUT", issues: parseResult.error.issues },
        { status: 400 },
      );
    }

    const { emoji } = parseResult.data;
    if (!(PLAYER_EMOJIS as readonly string[]).includes(emoji)) {
      return Response.json(
        { error: "INVALID_INPUT", message: "Invalid emoji" },
        { status: 400 },
      );
    }

    const room = await updateSsPlayerEmoji(roomId, guestId, emoji);
    return Response.json(room);
  } catch (e) {
    return handleSsRouteError(e);
  }
}
