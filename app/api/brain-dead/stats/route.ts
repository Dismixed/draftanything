import { ensureGuestSession } from "@/features/guest/session";
import { buildPersonalStats } from "@/lib/brain-dead/stats";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supa = await createClient();
  const { data: auth } = await supa.auth.getUser();
  const userId = auth.user?.id ?? null;

  let guestId: string | null = null;
  try {
    const guest = await ensureGuestSession();
    guestId = guest.guestId;
  } catch {
    // Stats still work from local storage when no guest session exists.
  }

  const db = createAdminClient();
  const rows: Array<{ score: number; play_date: string }> = [];

  if (userId) {
    const { data } = await db
      .from("brain_dead_leaderboard")
      .select("score, play_date")
      .eq("user_id", userId);
    if (data) rows.push(...data);
  }

  if (guestId) {
    const { data } = await db
      .from("brain_dead_leaderboard")
      .select("score, play_date")
      .eq("guest_id", guestId);
    if (data) rows.push(...data);
  }

  const playDates = rows.map((row) => row.play_date);
  const bestScore = rows.reduce(
    (max, row) => Math.max(max, row.score),
    0,
  );
  const stats = buildPersonalStats(playDates, bestScore);

  return Response.json({
    ...stats,
    playDates: [...new Set(playDates)],
  });
}
