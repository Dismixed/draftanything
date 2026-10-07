import { GameAbout } from "@/components/games/game-about";
import HotTakesGame from "@/components/hot-takes/game";
import { getDailyCategoryForPlay } from "@/lib/hot-takes/daily-service";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function HotTakesPage() {
  const db = createAdminClient();
  const category = await getDailyCategoryForPlay(db);
  return (
    <>
      <HotTakesGame initialCategory={category} />
      <GameAbout gameId="hot-takes" />
    </>
  );
}
