import BrainDeadGame from "@/components/brain-dead/game";

export default function DailyPage() {
  return (
    <main
      className="game-page"
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 20px 64px",
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
      <div style={{ width: "100%", maxWidth: "720px", position: "relative", zIndex: 1 }}>
        <BrainDeadGame mode="daily" categoryName="Daily Mix" />
      </div>
    </main>
  );
}
