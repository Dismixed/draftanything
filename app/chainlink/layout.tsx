import type { Metadata } from "next";
import { gameMetadata } from "@/lib/games/content";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = gameMetadata("chainlink");

export default function ChainlinkLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <JsonLdScript data={buildGameJsonLd("chainlink")} />
      {children}
    </>
  );
}
