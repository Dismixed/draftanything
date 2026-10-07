import type { Metadata } from "next";
import { GameAbout } from "@/components/games/game-about";
import SlipperySlopeGame from "@/components/slippery-slope/game";
import { gameMetadata } from "@/lib/games/content";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = gameMetadata("slippery-slope");

export default function SlipperySlopePage() {
  return (
    <>
      <JsonLdScript data={buildGameJsonLd("slippery-slope")} />
      <SlipperySlopeGame />
      <GameAbout gameId="slippery-slope" />
    </>
  );
}
