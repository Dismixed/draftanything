import ChainlinkGame from "@/components/chainlink/game";

export default function UnlimitedPuzzlePage() {
  return (
    <main
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
            "radial-gradient(ellipse 70% 35% at 50% -8%, rgba(0,229,255,0.05) 0%, transparent 55%), radial-gradient(ellipse 50% 30% at 20% 90%, rgba(201,168,76,0.03) 0%, transparent 50%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ width: "100%", maxWidth: "560px", position: "relative", zIndex: 1 }}>
        <ChainlinkGame mode="unlimited" />
      </div>
    </main>
  );
}
