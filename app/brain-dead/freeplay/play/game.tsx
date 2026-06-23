"use client";

import { use } from "react";
import BrainDeadGame from "@/components/brain-dead/game";
import { CATEGORIES } from "@/lib/brain-dead/game-logic";
import type { CategoryId } from "@/lib/brain-dead/types";

const VALID_IDS = new Set(CATEGORIES.map((c) => c.id));

export default function FreeplayGame({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = use(searchParams);
  const categoryId: CategoryId =
    cat && VALID_IDS.has(cat as CategoryId) ? (cat as CategoryId) : "random";
  const categoryName =
    CATEGORIES.find((c) => c.id === categoryId)?.name ?? "Random Mix";

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
            "radial-gradient(ellipse 70% 35% at 50% -8%, rgba(124,58,255,0.05) 0%, transparent 55%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ width: "100%", maxWidth: "720px", position: "relative", zIndex: 1 }}>
        <BrainDeadGame
          mode="freeplay"
          category={categoryId}
          categoryName={categoryName}
        />
      </div>
    </main>
  );
}
