"use client";

import Link from "next/link";
import { OtherDailies } from "@/components/daily/other-dailies";
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
  const isWin = store.status === "won";

  const displayScore = useCountUp(
    store.totalScore,
    scoreActive ?? isWin,
    900,
  );

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
        Daily Complete
      </div>

      <div style={{ margin: "20px 0", display: "flex", flexDirection: "column", gap: "10px" }}>
        <StatRow label="Total Score" value={`${displayScore}`} highlight={isWin} />

        {store.roundResults.map((round) => (
          <DailyRoundRow key={round.roundIndex} round={round} />
        ))}
      </div>

      <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <button style={primaryBtnStyle}>Back home</button>
        </Link>
        <Link href="/anyguessr/daily" style={{ textDecoration: "none" }}>
          <button style={secondaryBtnStyle}>View results</button>
        </Link>
      </div>

      <OtherDailies currentGameId="anyguessr" />

      <div
        style={{
          marginTop: "18px",
          fontSize: "10px",
          color: "var(--ag-muted)",
          opacity: 0.7,
        }}
      >
        Come back tomorrow · {getDateString()}
      </div>
    </div>
  );
}

function DailyRoundRow({
  round,
}: {
  round: {
    roundIndex: number;
    clueType: string;
    answer: string;
    flagUrl?: string;
    roundScore: number;
    exact: boolean;
    surrendered?: boolean;
    distanceKm: number;
  };
}) {
  const label =
    DAILY_CLUE_TYPE_LABEL[round.clueType as keyof typeof DAILY_CLUE_TYPE_LABEL] ??
    round.clueType;
  const scoreLabel = round.surrendered
    ? "0"
    : round.exact
      ? `+${round.roundScore}`
      : `+${round.roundScore} · ${formatDistanceKm(round.distanceKm)}`;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 14px",
        background: "var(--ag-surface-hi)",
        borderRadius: "8px",
        border: "1px solid var(--ag-border-faint)",
        gap: "12px",
      }}
    >
      <div style={{ textAlign: "left", minWidth: 0 }}>
        <div
          style={{
            fontSize: "10px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ag-muted)",
            marginBottom: "4px",
          }}
        >
          {label}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
            fontWeight: 700,
            color: "var(--ag-text)",
          }}
        >
          {round.flagUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={round.flagUrl}
              alt=""
              style={{
                width: "24px",
                height: "16px",
                borderRadius: "2px",
                objectFit: "cover",
                flexShrink: 0,
              }}
            />
          ) : null}
          <span>{round.answer}</span>
        </div>
      </div>
      <span
        style={{
          fontSize: "13px",
          fontWeight: 700,
          color: "var(--ag-accent)",
          whiteSpace: "nowrap",
        }}
      >
        {scoreLabel}
      </span>
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
