import type { Metadata } from "next";
import { NOINDEX } from "@/lib/seo";
import FreezeFramesLeaderboard from "@/components/freezeframes/leaderboard";

export const metadata: Metadata = {
  title: "Leaderboard — FreezeFrames",
  description: "Today's FreezeFrames daily challenge leaderboard.",
  alternates: { canonical: "/freezeframes/leaderboard" },
  robots: NOINDEX,
};

export default function FreezeFramesLeaderboardPage() {
  return <FreezeFramesLeaderboard />;
}
