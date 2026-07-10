import type { Metadata } from "next";
import FreezeFramesLeaderboard from "@/components/freezeframes/leaderboard";

export const metadata: Metadata = {
  title: "Leaderboard — FreezeFrames",
  description: "Today's FreezeFrames daily challenge leaderboard.",
};

export default function FreezeFramesLeaderboardPage() {
  return <FreezeFramesLeaderboard />;
}
