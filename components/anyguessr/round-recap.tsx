"use client";

import { DAILY_CLUE_TYPE_LABEL, formatDistanceKm } from "@/lib/anyguessr/daily";
import type { DailyRoundRecap } from "@/lib/anyguessr/types";
import GuessMap from "./guess-map";

interface Props {
  recap: DailyRoundRecap;
  totalScore: number;
  onContinue: () => void;
}

export default function RoundRecap({ recap, totalScore, onContinue }: Props) {
  const clueLabel =
    DAILY_CLUE_TYPE_LABEL[recap.clueType as keyof typeof DAILY_CLUE_TYPE_LABEL] ??
    recap.clueType;

  return (
    <div
      className="anim-fade-slide-up"
      style={{
        padding: "24px 20px",
        textAlign: "center",
        border: "1px solid var(--ag-border)",
        background: "var(--ag-surface)",
        borderRadius: "14px",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--ag-muted)",
          marginBottom: "6px",
        }}
      >
        Round {recap.roundIndex + 1} · {clueLabel}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        {recap.flagUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recap.flagUrl}
            alt=""
            style={{
              width: "32px",
              height: "22px",
              borderRadius: "3px",
              objectFit: "cover",
            }}
          />
        ) : null}
        <span
          style={{
            fontSize: "clamp(22px, 5vw, 28px)",
            fontWeight: 800,
            color: "var(--ag-text)",
            letterSpacing: "-0.02em",
          }}
        >
          {recap.answer}
        </span>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <GuessMap
          answerLat={recap.answerLat}
          answerLng={recap.answerLng}
          guessLat={recap.guessLat}
          guessLng={recap.guessLng}
          answerCca3={recap.answerCca3}
          guessCca3={recap.guessCca3}
          answerLabel={recap.answer}
          guessLabel={recap.guess}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        <StatBlock
          label="Distance"
          value={recap.exact ? "0 km" : formatDistanceKm(recap.distanceKm)}
        />
        <StatBlock label="Round score" value={`+${recap.roundScore}`} highlight />
      </div>

      <p
        style={{
          fontSize: "12px",
          color: "var(--ag-muted)",
          margin: "0 0 16px",
        }}
      >
        You guessed <strong style={{ color: "var(--ag-text)" }}>{recap.guess}</strong>
        {recap.exact ? " — spot on!" : ""}
      </p>

      <button type="button" onClick={onContinue} style={primaryBtnStyle}>
        {recap.isFinalRound ? "See results" : "Continue"}
      </button>

      <div
        style={{
          marginTop: "12px",
          fontSize: "11px",
          color: "var(--ag-muted)",
        }}
      >
        Total score: <span style={{ color: "var(--ag-accent)", fontWeight: 700 }}>{totalScore}</span>
      </div>
    </div>
  );
}

function StatBlock({
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
        padding: "10px 12px",
        background: "var(--ag-surface-hi)",
        borderRadius: "8px",
        border: "1px solid var(--ag-border-faint)",
      }}
    >
      <div
        style={{
          fontSize: "9px",
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
          fontSize: "18px",
          fontWeight: 700,
          color: highlight ? "var(--ag-accent)" : "var(--ag-text)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

const primaryBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 18px",
  fontSize: "13px",
  fontWeight: 600,
  letterSpacing: "0.04em",
  borderRadius: "10px",
  cursor: "pointer",
  border: "none",
  background: "var(--ag-accent)",
  color: "#0b0e1c",
};
