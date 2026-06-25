"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GameBackLink } from "@/components/ui/game-back-link";
import { CATEGORIES } from "@/lib/brain-dead/game-logic";
import type { CategoryId } from "@/lib/brain-dead/types";

const CATEGORY_COLORS: Record<CategoryId, string> = {
  general: "#0ea5e9",
  sports: "#22c55e",
  movies: "#d97706",
  music: "#a855f7",
  science: "#06b6d4",
  history: "#eab308",
  food: "#f97316",
  tech: "#6366f1",
  geography: "#14b8a6",
  random: "#d97706",
};

function CategoryIcon({ id }: { id: CategoryId }) {
  const stroke = CATEGORY_COLORS[id];
  switch (id) {
    case "general":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      );
    case "sports":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M2 12h20"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      );
    case "movies":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="2.18"/>
          <line x1="7" y1="2" x2="7" y2="22"/>
          <line x1="17" y1="2" x2="17" y2="22"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <line x1="2" y1="7" x2="7" y2="7"/>
          <line x1="2" y1="17" x2="7" y2="17"/>
          <line x1="17" y1="17" x2="22" y2="17"/>
          <line x1="17" y1="7" x2="22" y2="7"/>
        </svg>
      );
    case "music":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13"/>
          <circle cx="6" cy="18" r="3"/>
          <circle cx="18" cy="16" r="3"/>
        </svg>
      );
    case "science":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/>
          <path d="M8.5 2h7"/>
          <path d="M12 12v7"/>
        </svg>
      );
    case "history":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18"/>
          <path d="M7 16v-5"/>
          <path d="M11 16V8"/>
          <path d="M15 16v-3"/>
          <path d="M19 16v-7"/>
        </svg>
      );
    case "food":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
          <path d="M7 2v20"/>
          <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>
        </svg>
      );
    case "tech":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/>
          <rect x="9" y="9" width="6" height="6"/>
          <line x1="9" y1="1" x2="9" y2="4"/>
          <line x1="15" y1="1" x2="15" y2="4"/>
          <line x1="9" y1="20" x2="9" y2="23"/>
          <line x1="15" y1="20" x2="15" y2="23"/>
          <line x1="20" y1="9" x2="23" y2="9"/>
          <line x1="20" y1="14" x2="23" y2="14"/>
          <line x1="1" y1="9" x2="4" y2="9"/>
          <line x1="1" y1="14" x2="4" y2="14"/>
        </svg>
      );
    case "geography":
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      );
    case "random":
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
      );
  }
}

export default function FreeplayPicker() {
  const router = useRouter();
  const [selected, setSelected] = useState<CategoryId>("random");

  const regularCategories = CATEGORIES.filter((c) => c.id !== "random");

  return (
    <div style={{ textAlign: "center", width: "100%", margin: "0 auto", position: "relative" }}>
      <header style={{ position: "relative", marginBottom: "24px" }}>
        <GameBackLink href="/brain-dead" color="var(--bd-text-muted)" />
      </header>
      <p
        style={{
          fontSize: "11px",
          letterSpacing: "2px",
          textTransform: "uppercase",
          color: "var(--bd-text-muted)",
          marginBottom: "4px",
        }}
      >
        Free Play
      </p>
      <h2
        style={{
          fontSize: "18px",
          fontWeight: 700,
          margin: "0 0 24px",
          color: "var(--bd-text)",
        }}
      >
        Pick a Category
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        {regularCategories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelected(cat.id)}
            style={{
              background: "var(--bd-surface)",
              border: `1px solid ${selected === cat.id ? CATEGORY_COLORS[cat.id] : "var(--bd-border)"}`,
              color: "var(--bd-text)",
              padding: "16px 8px",
              borderRadius: "10px",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "11px",
              fontWeight: 600,
              transition: "all 0.15s",
            }}
          >
            <span style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
              <CategoryIcon id={cat.id} />
            </span>
            {cat.name}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setSelected("random")}
        style={{
          background: "var(--bd-surface)",
          border: `1px solid ${selected === "random" ? "var(--bd-primary)" : "var(--bd-border)"}`,
          color: "var(--bd-text)",
          padding: "14px",
          borderRadius: "10px",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: "12px",
          fontWeight: 600,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          transition: "all 0.15s",
          marginBottom: "28px",
        }}
      >
        <CategoryIcon id="random" />
        <div>
          <div>Random Mix</div>
          <div style={{ fontSize: "9px", color: "var(--bd-text-muted)", fontWeight: 400 }}>
            All categories, shuffled
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => router.push(`/brain-dead/freeplay/play?cat=${selected}`)}
        style={{
          background: "var(--bd-primary)",
          color: "#fff",
          border: "none",
          padding: "14px 32px",
          fontFamily: "inherit",
          fontSize: "14px",
          fontWeight: 700,
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        Let&apos;s Go
      </button>
    </div>
  );
}
