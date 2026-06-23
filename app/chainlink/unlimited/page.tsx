import ChainlinkGame from "@/components/chainlink/game";

export default function UnlimitedPuzzlePage() {
  return (
    <main
      className="game-page"
      style={{
        minHeight: "100vh",
        background: "#121213",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 20px 64px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ width: "100%", maxWidth: "560px", position: "relative", zIndex: 1 }}>
        <ChainlinkGame mode="unlimited" />
      </div>
    </main>
  );
}
