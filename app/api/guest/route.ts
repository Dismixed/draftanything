import { AppError } from "@/lib/errors";
import { ensureGuestSession } from "@/features/guest/session";

/**
 * POST /api/guest
 *
 * Bootstraps a guest session. Idempotent — calling it multiple times for the
 * same browser returns the same guestId. Creates a new session if the
 * guest_token cookie is absent and sets an HTTP-only cookie on the response.
 *
 * Returns: { guestId: string }
 */
export async function POST() {
  try {
    const { guestId } = await ensureGuestSession();
    return Response.json({ guestId });
  } catch (e) {
    if (e instanceof AppError) {
      return Response.json({ error: e.code }, { status: 400 });
    }
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
