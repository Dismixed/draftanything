import { AppError } from "@/lib/errors";
import { ensureGuestSession } from "@/features/guest/session";
import { generateRequestId, setRequestIdHeader } from "@/lib/request-id";
import { logRoute } from "@/lib/logger";
import { getPostHogClient } from "@/lib/posthog-server";

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
  const requestId = generateRequestId();
  const start = performance.now();

  try {
    const { guestId } = await ensureGuestSession();
    const posthog = getPostHogClient();
    posthog.identify({ distinctId: guestId });
    posthog.capture({
      distinctId: guestId,
      event: "guest_session_created",
      properties: {},
    });
    await posthog.flush();
    const res = Response.json({ guestId });
    setRequestIdHeader(res, requestId);
    logRoute({ timestamp: new Date().toISOString(), requestId, action: "bootstrap_guest", result: "success", durationMs: performance.now() - start });
    return res;
  } catch (e) {
    if (e instanceof AppError) {
      const res = Response.json({ error: e.code }, { status: 400 });
      setRequestIdHeader(res, requestId);
      logRoute({ timestamp: new Date().toISOString(), requestId, action: "bootstrap_guest", result: e.code, durationMs: performance.now() - start });
      return res;
    }
    const res = Response.json({ error: "internal_error" }, { status: 500 });
    setRequestIdHeader(res, requestId);
    logRoute({ timestamp: new Date().toISOString(), requestId, action: "bootstrap_guest", result: "INTERNAL_ERROR", durationMs: performance.now() - start });
    return res;
  }
}
