import BallKnowledgeGame from "@/components/ball-knowledge/game";
import { GameAbout } from "@/components/games/game-about";
import { DailyIntroScope, IntroOnly } from "@/lib/daily-intro/intro-scope";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDailyCategory } from "@/lib/ball-knowledge/puzzle-service";

export default async function BallKnowledgeDailyPage() {
  let category: string;
  try {
    const db = createAdminClient();
    category = await getDailyCategory(db);
  } catch {
    // Fall back to the deterministic rotation if the DB is unavailable.
    const { getTodayCategory } = await import("@/lib/ball-knowledge/game-logic");
    category = getTodayCategory();
  }
  return (
    <DailyIntroScope>
      <BallKnowledgeGame category={category} />
      <IntroOnly>
        <GameAbout gameId="ball-knowledge" />
      </IntroOnly>
    </DailyIntroScope>
  );
}
