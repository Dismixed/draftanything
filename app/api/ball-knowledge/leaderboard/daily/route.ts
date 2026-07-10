import { getDateString } from "@/lib/ball-knowledge/game-logic";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const playDate = searchParams.get("date") ?? getDateString();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(playDate)) {
    return Response.json({ error: "INVALID_DATE" }, { status: 400 });
  }

  const db = createAdminClient();
  const { data, error } = await db
    .from("ball_knowledge_leaderboard")
    .select("id, display_name, score, play_date, created_at")
    .eq("play_date", playDate)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    return Response.json({ error: "FETCH_FAILED" }, { status: 500 });
  }

  return Response.json({
    entries: (data ?? []).map((row) => ({
      id: row.id,
      name: row.display_name,
      score: row.score,
      date: row.play_date,
      ts: new Date(row.created_at).getTime(),
    })),
  });
}
