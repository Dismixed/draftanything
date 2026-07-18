import type { Metadata } from "next";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Chain Link — Stim Labs",
  description: "Link words together in a chain. Each word pairs with the one before it.",
  alternates: {
    canonical: "/chainlink",
  },
};

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
