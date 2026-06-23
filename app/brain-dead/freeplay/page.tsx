import type { Metadata } from "next";
import FreeplayPicker from "@/components/brain-dead/freeplay-picker";

export const metadata: Metadata = {
  title: "Free Play — Brain Dead",
  description: "Pick a trivia category and play Brain Dead free play mode.",
};

export default function FreeplayPage() {
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
            "radial-gradient(ellipse 70% 35% at 50% -8%, rgba(124,58,255,0.05) 0%, transparent 55%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
        <FreeplayPicker />
      </div>
    </main>
  );
}
