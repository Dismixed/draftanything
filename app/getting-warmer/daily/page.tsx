import type { Metadata } from "next";
import GettingWarmerGame from "@/components/getting-warmer/game";

export const metadata: Metadata = {
  title: "Getting Warmer — Daily Word Game",
  description:
    "Two clues to start. Guess wrong, get one more. Unlimited guesses with hints that keep generating.",
};

export default function GettingWarmerDailyPage() {
  return <GettingWarmerGame />;
}
