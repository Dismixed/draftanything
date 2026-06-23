import type { Metadata } from "next";
import FreeplayPicker from "@/components/brain-dead/freeplay-picker";

export const metadata: Metadata = {
  title: "Free Play — Brain Dead",
  description: "Pick a trivia category and play Brain Dead free play mode.",
};

export default function FreeplayPage() {
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
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "480px" }}>
        <FreeplayPicker />
      </div>
    </main>
  );
}
