import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hashGuestToken } from "@/features/guest/token";

export async function POST(request: Request) {
  try {
    let body: { puzzleId?: string; mode?: string; score?: number; completed?: boolean };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { puzzleId, mode, score, completed } = body;

    if (!mode || typeof mode !== "string") {
      return NextResponse.json({ error: "mode is required" }, { status: 400 });
    }
    if (typeof score !== "number") {
      return NextResponse.json({ error: "score is required" }, { status: 400 });
    }
    if (typeof completed !== "boolean") {
      return NextResponse.json({ error: "completed is required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const guestToken = cookieStore.get("guest_token")?.value;

    let guestId: string | null = null;
    if (guestToken) {
      const pepper = process.env.GUEST_TOKEN_PEPPER;
      if (pepper) {
        const tokenHash = hashGuestToken(guestToken, pepper);
        const admin = createAdminClient();
        const { data } = await admin
          .rpc("get_active_guest_session_id", { p_token_hash: tokenHash })
          .single();
        guestId = data as string | null;
      }
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("chain_puzzle_attempts")
      .insert({
        puzzle_id: puzzleId ?? null,
        mode,
        completed,
        score,
        guest_id: guestId,
        user_id: user?.id ?? null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to save attempt:", error);
      return NextResponse.json({ error: "Failed to save attempt" }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error("Failed to save attempt:", err);
    return NextResponse.json({ error: "Failed to save attempt" }, { status: 500 });
  }
}
