import type { Metadata } from "next";
import Leaderboard from "@/components/brain-dead/leaderboard";

export const metadata: Metadata = {
  title: "Leaderboard — Brain Dead",
  description: "Today's Brain Dead daily challenge leaderboard.",
};

export default function LeaderboardPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bd-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 24px 64px",
      }}
    >
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "520px" }}>
        <Leaderboard />
      </div>
    </main>
  );
}
