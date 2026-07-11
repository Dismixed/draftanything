import type { Metadata } from "next";
import GettingWarmerGame from "@/components/getting-warmer/game";
import { buildGameJsonLd, JsonLdScript } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Getting Warmer — Daily Word Game",
  description:
    "Two clues to start. Guess wrong, get one more. Unlimited guesses with hints that keep generating.",
  alternates: {
    canonical: "/getting-warmer/daily",
  },
};

export default function GettingWarmerDailyPage() {
  return (
    <>
      <JsonLdScript data={buildGameJsonLd("getting-warmer")} />
      <GettingWarmerGame />
    </>
  );
}
