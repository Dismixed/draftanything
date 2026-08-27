import { createAdminClient } from "@/lib/supabase/admin";
import { getDailyCategory } from "@/lib/ball-knowledge/puzzle-service";
import { getDateString } from "@/lib/ball-knowledge/game-logic";

export async function GET() {
  const playDate = getDateString();

  let category: string;
  try {
    const db = createAdminClient();
    category = await getDailyCategory(db);
  } catch {
    // Fall back to the deterministic rotation if the DB is unavailable.
    const { getTodayCategory } = await import("@/lib/ball-knowledge/game-logic");
    category = getTodayCategory();
  }

  return Response.json({ playDate, category });
}
