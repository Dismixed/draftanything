"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CATEGORIES } from "@/lib/brain-dead/game-logic";
import type { CategoryId } from "@/lib/brain-dead/types";

const ACCENT = "#ff3c3c";

export default function FreeplayPicker() {
  const router = useRouter();
  const [selected, setSelected] = useState<CategoryId>("random");

  return (
    <div style={{ textAlign: "center", width: "100%", maxWidth: "580px", margin: "0 auto" }}>
      <p
        style={{
          fontSize: "0.72rem",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--text-dim)",
          marginBottom: "12px",
        }}
      >
        Free Play
      </p>
      <h2
        style={{
          fontFamily: '"Playfair Display", serif',
          fontSize: "clamp(1.8rem, 4vw, 2.2rem)",
          margin: "0 0 8px",
          color: "var(--text)",
        }}
      >
        What do you{" "}
        <em style={{ fontStyle: "italic", color: ACCENT }}>know?</em>
      </h2>
      <p style={{ color: "var(--text-dim)", fontSize: "0.9rem", marginBottom: "24px" }}>
        Pick a category or go random
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "12px",
          marginBottom: "28px",
        }}
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelected(cat.id)}
            style={{
              background:
                selected === cat.id ? "rgba(255,60,60,0.1)" : "var(--panel)",
              border: `1px solid ${
                selected === cat.id ? ACCENT : "var(--border-hi)"
              }`,
              color: "var(--text)",
              padding: "16px 8px",
              borderRadius: "10px",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "0.88rem",
              fontWeight: 500,
              transition: "all 0.15s",
            }}
          >
            <span style={{ display: "block", fontSize: "1.4rem", marginBottom: "6px" }}>
              {cat.emoji}
            </span>
            {cat.name}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          router.push(`/brain-dead/freeplay/play?cat=${selected}`)
        }
        style={{
          background: ACCENT,
          color: "#fff",
          border: "none",
          padding: "14px 32px",
          fontFamily: "inherit",
          fontSize: "1rem",
          fontWeight: 700,
          borderRadius: "8px",
          cursor: "pointer",
        }}
      >
        Let&apos;s Go →
      </button>

      <p style={{ marginTop: "48px", fontSize: "10px", color: "var(--text-dim)", opacity: 0.4 }}>
        &larr;{" "}
        <Link href="/brain-dead" style={{ color: "inherit", textDecoration: "none" }}>
          Back to Brain Dead
        </Link>
      </p>
    </div>
  );
}
