import type { Metadata } from "next";
import { gameMetadata } from "@/lib/games/content";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = gameMetadata("hot-takes");

export default function HotTakesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <JsonLdScript data={buildGameJsonLd("hot-takes")} />
      {children}
    </>
  );
}
