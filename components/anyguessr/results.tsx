"use client";

import Link from "next/link";
import { DAILY_CLUE_TYPE_LABEL, formatDistanceKm } from "@/lib/anyguessr/daily";
import { useCountUp } from "@/lib/motion/count-up";
import { useAnyGuessrStore } from "@/lib/anyguessr/store";

function getDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function Results({
  scoreActive,
  embedded,
}: {
  scoreActive?: boolean;
  embedded?: boolean;
}) {
  const store = useAnyGuessrStore();
  const isDaily = store.mode === "daily";
  const isInfinite = store.mode === "infinite";

  const isWin = store.status === "won";
  const isSurrendered = isInfinite && store.status === "surrendered";

  const dailyScore = useCountUp(
    isDaily ? store.totalScore : 0,
    isDaily && (scoreActive ?? isWin),
    900,
  );
  const infiniteScore = useCountUp(
    isInfinite && isWin ? store.score : 0,
    isInfinite && (scoreActive ?? isWin),
    900,
  );
  const displayScore = isDaily ? dailyScore : infiniteScore;

  const nextLabel = isDaily ? "Come back tomorrow" : "Play next round";

  return (
    <div
      className={embedded ? undefined : "anim-fade-slide-up"}
      style={{
        marginTop: embedded ? 0 : "20px",
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
        {isDaily ? "Daily Complete" : isSurrendered ? "Surrendered" : "Solved"}
      </div>

      {isDaily && store.answer && (
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
          {store.flagUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={store.flagUrl}
              alt=""
              style={{ width: "44px", height: "30px", borderRadius: "4px", objectFit: "cover" }}
            />
          ) : null}
          <span>{store.answer}</span>
        </div>
      )}

      {isInfinite && (
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
          {store.flagUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={store.flagUrl}
              alt=""
              style={{ width: "44px", height: "30px", borderRadius: "4px", objectFit: "cover" }}
            />
          ) : null}
          <span>{store.answer ?? "—"}</span>
        </div>
      )}

      <div style={{ margin: "20px 0", display: "flex", flexDirection: "column", gap: "10px" }}>
        <StatRow
          label="Total Score"
          value={isWin || (isDaily && isWin) ? `${displayScore}` : isSurrendered ? "0" : `${displayScore}`}
          highlight={isWin}
        />

        {isDaily &&
          store.roundResults.map((round) => (
            <StatRow
              key={round.roundIndex}
              label={
                DAILY_CLUE_TYPE_LABEL[
                  round.clueType as keyof typeof DAILY_CLUE_TYPE_LABEL
                ] ?? round.clueType
              }
              value={
                round.exact
                  ? `+${round.roundScore} · correct`
                  : `+${round.roundScore} · ${formatDistanceKm(round.distanceKm)}`
              }
            />
          ))}

        {isInfinite && (
          <>
            <StatRow label="Guesses Made" value={`${store.guesses.length}`} />
            <StatRow
              label="Clues Revealed"
              value={`${store.revealedCount} / ${store.totalClues}`}
            />
          </>
        )}
      </div>

      {store.funFact && (
        <div
          style={{
            fontSize: "12px",
            color: "var(--ag-muted)",
            lineHeight: 1.55,
            margin: "0 0 20px",
            fontStyle: "italic",
          }}
        >
          {store.funFact}
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
        {isInfinite ? (
          <button onClick={() => store.nextRound()} style={primaryBtnStyle}>
            Play Infinite
          </button>
        ) : (
          <Link href="/" style={{ textDecoration: "none" }}>
            <button style={primaryBtnStyle}>Back home</button>
          </Link>
        )}
        <Link href="/anyguessr/infinite" style={{ textDecoration: "none" }}>
          <button style={secondaryBtnStyle}>Infinite</button>
        </Link>
      </div>

      {isDaily && (
        <div
          style={{
            marginTop: "18px",
            fontSize: "10px",
            color: "var(--ag-muted)",
            opacity: 0.7,
          }}
        >
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
        gap: "12px",
      }}
    >
      <span
        style={{
          fontSize: "11px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ag-muted)",
          textAlign: "left",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "14px",
          fontWeight: 700,
          color: highlight ? "var(--ag-accent)" : "var(--ag-text)",
          textAlign: "right",
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
