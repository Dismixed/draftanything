import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseAttempt, recordAttempt } from "@/lib/chainlink/plays";
import { checkRateLimit } from "@/lib/rate-limit";

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
    await recordAttempt(createAdminClient(), attempt);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to record attempt:", err);
    return NextResponse.json({ error: "Failed to record attempt" }, { status: 500 });
  }
}
