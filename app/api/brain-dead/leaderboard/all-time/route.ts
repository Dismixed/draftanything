import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const db = createAdminClient();
  const { data, error } = await db
    .from("brain_dead_leaderboard")
    .select("user_id, score, correct")
    .not("user_id", "is", null)
    .order("score", { ascending: false, nullsFirst: false })
    .limit(1000);

  if (error) {
    return Response.json({ error: "FETCH_FAILED" }, { status: 500 });
  }

  const userStats = new Map<
    string,
    { bestScore: number; bestCorrect: number; gamesPlayed: number }
  >();
  for (const row of data ?? []) {
    const uid = row.user_id!;
    const s = userStats.get(uid);
    if (!s) {
      userStats.set(uid, {
        bestScore: row.score,
        bestCorrect: row.correct,
        gamesPlayed: 1,
      });
    } else {
      s.gamesPlayed++;
      if (row.score > s.bestScore) {
        s.bestScore = row.score;
        s.bestCorrect = row.correct;
      }
    }
  }

  const userIds = [...userStats.keys()];
  if (userIds.length === 0) {
    return Response.json({ entries: [] });
  }

  const { data: profiles } = await db
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", userIds);

  const profileMap = new Map<
    string,
    { display_name: string; avatar_url: string | null }
  >();
  for (const p of profiles ?? []) {
    profileMap.set(p.id, {
      display_name: p.display_name,
      avatar_url: p.avatar_url,
    });
  }

  const entries = [...userStats.entries()]
    .map(([uid, stats]) => ({
      playerId: uid,
      name: profileMap.get(uid)?.display_name ?? "Unknown",
      avatarUrl: profileMap.get(uid)?.avatar_url ?? null,
      bestScore: stats.bestScore,
      bestCorrect: stats.bestCorrect,
      gamesPlayed: stats.gamesPlayed,
    }))
    .sort((a, b) => b.bestScore - a.bestScore)
    .slice(0, 100);

  return Response.json({ entries });
}
