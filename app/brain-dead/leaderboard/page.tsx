import type { Metadata } from "next";
import Leaderboard from "@/components/brain-dead/leaderboard";

export const metadata: Metadata = {
  title: "Leaderboard — Brain Dead",
  description: "Today's Brain Dead daily challenge leaderboard.",
};

export default function LeaderboardPage() {
  return (
    <main
      className="game-page"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 24px 64px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 70% 35% at 50% -8%, rgba(255,60,60,0.05) 0%, transparent 55%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
        <Leaderboard />
      </div>
    </main>
  );
}
