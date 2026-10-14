import BrainDeadGame from "@/components/brain-dead/game";
import { GameAbout } from "@/components/games/game-about";
import { DailyIntroScope, IntroOnly } from "@/lib/daily-intro/intro-scope";

/** The Brain Dead hub: today's run plays here, and free play is one click away. */
export default function BrainDeadPage() {
  return (
    <DailyIntroScope>
      <main className="bd-page">
        <div className="bd-col">
          <BrainDeadGame mode="daily" categoryName="Daily Mix" />
        </div>
      </main>
      <IntroOnly>
        <GameAbout gameId="brain-dead" />
      </IntroOnly>
    </DailyIntroScope>
  );
}
