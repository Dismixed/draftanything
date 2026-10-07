import type { Metadata } from "next";
import FreezeFramesGame from "@/components/freezeframes/game";
import { GameAbout } from "@/components/games/game-about";
import { gameMetadata } from "@/lib/games/content";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = gameMetadata("freezeframes");

export default function FreezeFramesDailyPage() {
  return (
    <>
      <JsonLdScript data={buildGameJsonLd("freezeframes")} />
      <FreezeFramesGame />
      <GameAbout gameId="freezeframes" />
    </>
  );
}
