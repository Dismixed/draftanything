import BrainDeadGame from "@/components/brain-dead/game";

export default function DailyPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bd-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 20px 64px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "480px", position: "relative", zIndex: 1 }}>
        <BrainDeadGame mode="daily" categoryName="Daily Mix" />
      </div>
    </main>
  );
}
