import { NextRequest, NextResponse } from "next/server";
import { ensureGuestSession } from "@/features/guest/session";
import { parseAttempt, recordAttempt, type AttemptPlayer } from "@/lib/chainlink/plays";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

async function signedInUserId(): Promise<string | null> {
  try {
    const supa = await createClient();
    const { data } = await supa.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * POST /api/chain/attempt
 *
 * Records that someone finished a puzzle, won or lost. The repeat rules use
 * this to tell a daily that was played from one nobody saw.
 */
export async function POST(req: NextRequest) {
  const rate = checkRateLimit("chainlink-attempt", 120, 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const attempt = parseAttempt(body);
  if (!attempt) {
    return NextResponse.json({ error: "Invalid attempt" }, { status: 400 });
  }

  try {
    // The table requires a user or a guest; an attempt without either is rejected.
    const userId = await signedInUserId();
    const player: AttemptPlayer = { userId, guestId: userId ? null : (await ensureGuestSession()).guestId };
    await recordAttempt(createAdminClient(), attempt, player);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to record attempt:", err);
    return NextResponse.json({ error: "Failed to record attempt" }, { status: 500 });
  }
}
