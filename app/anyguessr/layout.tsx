import type { Metadata } from "next";
import { GameAbout } from "@/components/games/game-about";
import { gameMetadata } from "@/lib/games/content";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = gameMetadata("anyguessr");

export default function AnyGuessrLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <JsonLdScript data={buildGameJsonLd("anyguessr")} />
      {children}
      <GameAbout gameId="anyguessr" />
    </>
  );
}
