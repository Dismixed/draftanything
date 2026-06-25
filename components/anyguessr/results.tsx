"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useSound } from "@/lib/audio/sound-context";
import { fireConfetti } from "@/lib/motion/confetti";
import { useCountUp } from "@/lib/motion/count-up";
import { useAnyGuessrStore } from "@/lib/anyguessr/store";

function getDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function Results() {
  const {
    status,
    answer,
    flagUrl,
    score,
    guesses,
    revealedCount,
    totalClues,
    funFact,
    mode,
    nextRound,
  } = useAnyGuessrStore();
  const { play } = useSound();
  const celebratedRef = useRef(false);
  const isWin = status === "won";
  const displayScore = useCountUp(isWin ? score : 0, isWin, 900);

  useEffect(() => {
    if (!isWin || celebratedRef.current) return;
    celebratedRef.current = true;
    play("win");
    void fireConfetti("gold");
  }, [isWin, play]);

  const nextLabel =
    mode === "daily"
      ? "Come back tomorrow"
      : "Play next round";

  return (
    <div
      className="anim-fade-slide-up"
      style={{
        marginTop: "20px",
        padding: "28px 24px",
        textAlign: "center",
        border: `1px solid ${isWin ? "var(--ag-accent)" : "var(--ag-border)"}`,
        background: "var(--ag-surface)",
        borderRadius: "14px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: isWin ? "var(--ag-accent)" : "var(--ag-muted)",
          marginBottom: "12px",
        }}
      >
        {isWin ? "Solved" : "Surrendered"}
      </div>

      <div
        style={{
          fontSize: "clamp(28px, 7vw, 40px)",
          fontWeight: 800,
          color: "var(--ag-text)",
          letterSpacing: "-0.02em",
          marginBottom: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "14px",
        }}
      >
        {flagUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={flagUrl}
            alt=""
            style={{ width: "44px", height: "30px", borderRadius: "4px", objectFit: "cover" }}
          />
        ) : null}
        <span>{answer ?? "—"}</span>
      </div>

      <div style={{ margin: "20px 0", display: "flex", flexDirection: "column", gap: "10px" }}>
        <StatRow label="Score" value={isWin ? `${displayScore}` : "0"} highlight={isWin} />
        <StatRow label="Guesses Made" value={`${guesses.length}`} />
        <StatRow label="Clues Revealed" value={`${revealedCount} / ${totalClues}`} />
      </div>

      {funFact && (
        <div
          style={{
            fontSize: "12px",
            color: "var(--ag-muted)",
            lineHeight: 1.55,
            margin: "0 0 20px",
            fontStyle: "italic",
          }}
        >
          {funFact}
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
        {mode === "infinite" ? (
          <button
            onClick={() => nextRound()}
            style={primaryBtnStyle}
          >
            Play Infinite
          </button>
        ) : (
          <Link href="/" style={{ textDecoration: "none" }}>
            <button style={primaryBtnStyle} disabled>Back home</button>
          </Link>
        )}
        <Link href="/anyguessr/infinite" style={{ textDecoration: "none" }}>
          <button style={secondaryBtnStyle}>Infinite</button>
        </Link>
      </div>

      {mode === "daily" && (
        <div style={{ marginTop: "18px", fontSize: "10px", color: "var(--ag-muted)", opacity: 0.7 }}>
          {nextLabel} · {getDateString()}
        </div>
      )}
    </div>
  );
}

function StatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        padding: "8px 14px",
        background: "var(--ag-surface-hi)",
        borderRadius: "8px",
        border: "1px solid var(--ag-border-faint)",
      }}
    >
      <span
        style={{
          fontSize: "11px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ag-muted)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "18px",
          fontWeight: 700,
          color: highlight ? "var(--ag-accent)" : "var(--ag-text)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

const PRIMARY_BASE: React.CSSProperties = {
  padding: "10px 18px",
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  borderRadius: "8px",
  cursor: "pointer",
  border: "none",
};

const primaryBtnStyle: React.CSSProperties = {
  ...PRIMARY_BASE,
  background: "var(--ag-accent)",
  color: "#0b0e1c",
};
const secondaryBtnStyle: React.CSSProperties = {
  ...PRIMARY_BASE,
  background: "var(--ag-surface-hi)",
  color: "var(--ag-text)",
  border: "1px solid var(--ag-border)",
};