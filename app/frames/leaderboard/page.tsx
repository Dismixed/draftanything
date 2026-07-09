import type { Metadata } from "next";
import FramesLeaderboard from "@/components/frames/leaderboard";

export const metadata: Metadata = {
  title: "Leaderboard — Frames",
  description: "Today's Frames daily challenge leaderboard.",
};

export default function FramesLeaderboardPage() {
  return <FramesLeaderboard />;
}
