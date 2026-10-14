import type { Metadata } from "next";
import { GameAbout } from "@/components/games/game-about";
import GettingWarmerGame from "@/components/getting-warmer/game";
import { DailyIntroScope, IntroOnly } from "@/lib/daily-intro/intro-scope";
import { gameMetadata } from "@/lib/games/content";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = gameMetadata("getting-warmer");

export default function GettingWarmerDailyPage() {
  return (
    <DailyIntroScope>
      <JsonLdScript data={buildGameJsonLd("getting-warmer")} />
      <GettingWarmerGame />
      <IntroOnly>
        <GameAbout gameId="getting-warmer" />
      </IntroOnly>
    </DailyIntroScope>
  );
}
