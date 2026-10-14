import type { Metadata } from "next";
import FreezeFramesGame from "@/components/freezeframes/game";
import { GameAbout } from "@/components/games/game-about";
import { DailyIntroScope, IntroOnly } from "@/lib/daily-intro/intro-scope";
import { gameMetadata } from "@/lib/games/content";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = gameMetadata("freezeframes");

export default function FreezeFramesDailyPage() {
  return (
    <DailyIntroScope>
      <JsonLdScript data={buildGameJsonLd("freezeframes")} />
      <FreezeFramesGame />
      <IntroOnly>
        <GameAbout gameId="freezeframes" />
      </IntroOnly>
    </DailyIntroScope>
  );
}
