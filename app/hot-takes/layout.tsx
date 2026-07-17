import type { Metadata } from "next";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Hot Takes — Stim Games",
  description: "Rank fifteen items S through D in today's debatable category.",
  alternates: {
    canonical: "/hot-takes",
  },
};

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
