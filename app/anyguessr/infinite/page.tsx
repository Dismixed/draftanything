import AnyGuessrGame from "@/components/anyguessr/game";

export default function AnyGuessrInfinitePage() {
  return (
    <main
      className="ag-game-page"
      style={{
        minHeight: "100vh",
        background: "var(--ag-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 20px 64px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 70% 40% at 50% -10%, rgba(224,168,88,0.10) 0%, transparent 60%), radial-gradient(ellipse 60% 35% at 80% 85%, rgba(124,58,255,0.06) 0%, transparent 55%)",
        }}
      />
      <div style={{ width: "100%", maxWidth: "560px", position: "relative", zIndex: 1 }}>
        <AnyGuessrGame mode="infinite" />
      </div>
    </main>
  );
}