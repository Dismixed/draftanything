import AnyGuessrGame from "@/components/anyguessr/game";
import { GameAbout } from "@/components/games/game-about";
import { DailyIntroScope, IntroOnly } from "@/lib/daily-intro/intro-scope";

export default function AnyGuessrPage() {
  return (
    <DailyIntroScope>
      <main className="ag-page">
        <AnyGuessrGame />
      </main>
      <IntroOnly>
        <GameAbout gameId="anyguessr" />
      </IntroOnly>
    </DailyIntroScope>
  );
}
