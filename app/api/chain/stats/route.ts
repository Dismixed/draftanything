import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hashGuestToken } from "@/features/guest/token";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const cookieStore = await cookies();
    const guestToken = cookieStore.get("guest_token")?.value;

    let guestId: string | null = null;
    if (guestToken) {
      const pepper = process.env.GUEST_TOKEN_PEPPER;
      if (pepper) {
        const tokenHash = hashGuestToken(guestToken, pepper);
        const adminLookup = createAdminClient();
        const { data } = await adminLookup
          .rpc("get_active_guest_session_id", { p_token_hash: tokenHash })
          .single();
        guestId = data as string | null;
      }
    }

    const admin = createAdminClient();
    let query = admin.from("chain_puzzle_attempts").select("*");

    if (user) {
      query = query.eq("user_id", user.id);
    } else if (guestId) {
      query = query.eq("guest_id", guestId);
    } else {
      return NextResponse.json({
        totalAttempts: 0,
        dailyCompleted: 0,
        currentStreak: 0,
        bestScore: 0,
        avgDifficulty: null,
        dailyHistory: [],
      });
    }

    const { data: attempts, error } = await query;

    if (error) {
      console.error("Failed to fetch attempts:", error);
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }

    const totalAttempts = attempts?.length ?? 0;

    const dailyAttempts = (attempts ?? []).filter((a) => a.mode === "daily");
    const dailyCompleted = dailyAttempts.filter((a) => a.completed).length;

    const scores = (attempts ?? []).map((a) => a.score);
    const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

    const dailyDates = dailyAttempts
      .filter((a) => a.completed && a.created_at)
      .map((a) => a.created_at!.slice(0, 10));

    const uniqueDays = [...new Set(dailyDates)].sort();

    const now = new Date();
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const dailyHistory = uniqueDays.filter((d) => d >= ninetyDaysAgo.toISOString().slice(0, 10));

    let currentStreak = 0;
    if (dailyHistory.length > 0) {
      const today = now.toISOString().slice(0, 10);
      const lastDate = dailyHistory[dailyHistory.length - 1];
      if (lastDate === today || lastDate === getYesterday()) {
        currentStreak = 1;
        for (let i = dailyHistory.length - 2; i >= 0; i--) {
          const expected = new Date(dailyHistory[i + 1]);
          expected.setDate(expected.getDate() - 1);
          const expectedStr = expected.toISOString().slice(0, 10);
          if (dailyHistory[i] === expectedStr) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    return NextResponse.json({
      totalAttempts,
      dailyCompleted,
      currentStreak,
      bestScore,
      avgDifficulty: null,
      dailyHistory,
    });
  } catch (err) {
    console.error("Failed to fetch stats:", err);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
