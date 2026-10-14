import { GameAbout } from "@/components/games/game-about";
import HotTakesGame from "@/components/hot-takes/game";
import { DailyIntroScope, IntroOnly } from "@/lib/daily-intro/intro-scope";
import { getDailyCategoryForPlay } from "@/lib/hot-takes/daily-service";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function HotTakesPage() {
  const db = createAdminClient();
  const category = await getDailyCategoryForPlay(db);
  return (
    <DailyIntroScope>
      <HotTakesGame initialCategory={category} />
      <IntroOnly>
        <GameAbout gameId="hot-takes" />
      </IntroOnly>
    </DailyIntroScope>
  );
}
