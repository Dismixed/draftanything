import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { hashGuestToken } from "@/features/guest/token";
import { AppError } from "@/lib/errors";
import { logRoute } from "@/lib/logger";
import { generateRequestId, setRequestIdHeader } from "@/lib/request-id";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getPostHogClient } from "@/lib/posthog-server";

export async function POST() {
  const requestId = generateRequestId();
  const start = performance.now();

  try {
    const cookieStore = await cookies();
    const guestToken = cookieStore.get("guest_token")?.value ?? null;

    if (!guestToken) {
      const res = NextResponse.json({ merged: false, reason: "no_guest_session" });
      setRequestIdHeader(res, requestId);
      logRoute({ requestId, action: "merge_guest", result: "no_guest_session", durationMs: performance.now() - start });
      return res;
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const res = NextResponse.json({ error: "UNAUTHORIZED", message: "No authenticated user" }, { status: 401 });
      setRequestIdHeader(res, requestId);
      logRoute({ requestId, action: "merge_guest", result: "UNAUTHORIZED", durationMs: performance.now() - start });
      return res;
    }

    const pepper = process.env.GUEST_TOKEN_PEPPER;
    if (!pepper) {
      throw new AppError("INVALID_INPUT", "GUEST_TOKEN_PEPPER is not configured");
    }

    const tokenHash = hashGuestToken(guestToken, pepper);
    const admin = createAdminClient();
    const { error: rpcError } = await admin.rpc("link_guest_to_account", {
      p_token_hash: tokenHash,
      p_user_id: user.id,
    });

    if (rpcError) {
      const res = NextResponse.json({ merged: false, reason: rpcError.message });
      setRequestIdHeader(res, requestId);
      logRoute({ requestId, action: "merge_guest", result: "rpc_error", durationMs: performance.now() - start });
      return res;
    }

    const posthog = getPostHogClient();
    posthog.identify({
      distinctId: user.id,
      properties: { linked_provider: user.app_metadata?.provider ?? "email" },
    });
    posthog.capture({
      distinctId: user.id,
      event: "account_linked",
      properties: { provider: user.app_metadata?.provider ?? "email" },
    });
    await posthog.flush();
    const res = NextResponse.json({ merged: true });
    setRequestIdHeader(res, requestId);
    logRoute({ requestId, action: "merge_guest", result: "success", durationMs: performance.now() - start });
    return res;
  } catch (e) {
    if (e instanceof AppError) {
      const res = NextResponse.json({ error: e.code, message: e.message }, { status: 400 });
      setRequestIdHeader(res, requestId);
      logRoute({ requestId, action: "merge_guest", result: e.code, durationMs: performance.now() - start });
      return res;
    }
    console.error("[POST /api/auth/merge]", e);
    const res = NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
    setRequestIdHeader(res, requestId);
    logRoute({ requestId, action: "merge_guest", result: "INTERNAL_ERROR", durationMs: performance.now() - start });
    return res;
  }
}
