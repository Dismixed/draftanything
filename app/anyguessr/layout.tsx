import type { Metadata } from "next";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = {
  title: "AnyGuessr — Stim Games",
  description: "Guess the country from cultural clues, flags, maps, and geography.",
  alternates: {
    canonical: "/anyguessr",
  },
};

export default function AnyGuessrLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <JsonLdScript data={buildGameJsonLd("anyguessr")} />
      {children}
    </>
  );
}
