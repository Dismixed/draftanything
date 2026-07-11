import type { Metadata } from "next";
import SlipperySlopeGame from "@/components/slippery-slope/game";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Slippery Slope — Stim Games",
  description: "A trivia board game where players answer questions and climb before opponents knock them back down.",
  alternates: {
    canonical: "/slippery-slope",
  },
};

export default function SlipperySlopePage() {
  return (
    <>
      <JsonLdScript data={buildGameJsonLd("slippery-slope")} />
      <SlipperySlopeGame />
    </>
  );
}
