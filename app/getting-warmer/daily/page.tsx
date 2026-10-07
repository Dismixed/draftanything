import type { Metadata } from "next";
import { GameAbout } from "@/components/games/game-about";
import GettingWarmerGame from "@/components/getting-warmer/game";
import { gameMetadata } from "@/lib/games/content";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = gameMetadata("getting-warmer");

export default function GettingWarmerDailyPage() {
  return (
    <>
      <JsonLdScript data={buildGameJsonLd("getting-warmer")} />
      <GettingWarmerGame />
      <GameAbout gameId="getting-warmer" />
    </>
  );
}
