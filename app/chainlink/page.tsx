import ChainlinkGame from "@/components/chainlink/game";
import { GameAbout } from "@/components/games/game-about";
import { DailyIntroScope, IntroOnly } from "@/lib/daily-intro/intro-scope";

export default function ChainlinkPage() {
  return (
    <DailyIntroScope>
      <main className="game-page cl-page">
        <div className="cl-col">
          <ChainlinkGame mode="daily" />
        </div>
      </main>
      <IntroOnly>
        <GameAbout gameId="chainlink" />
      </IntroOnly>
    </DailyIntroScope>
  );
}
