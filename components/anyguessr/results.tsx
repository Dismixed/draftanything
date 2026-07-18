"use client";

import { useCallback, useEffect, useState } from "react";
import ClueCard from "@/components/anyguessr/clue-card";
import { OtherDailies } from "@/components/daily/other-dailies";
import { DAILY_CLUE_TYPE_LABEL, formatDistanceKm } from "@/lib/anyguessr/daily";
import { useCountUp } from "@/lib/motion/count-up";
import { useAnyGuessrStore } from "@/lib/anyguessr/store";
import type { DailyRoundResult } from "@/lib/anyguessr/types";

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
  const rounds = store.roundResults;
  const [cardIndex, setCardIndex] = useState(0);

  const displayScore = useCountUp(
    store.totalScore,
    scoreActive ?? isWin,
    900,
  );

  const goPrev = useCallback(() => {
    setCardIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setCardIndex((i) => Math.min(rounds.length - 1, i + 1));
  }, [rounds.length]);

  useEffect(() => {
    if (cardIndex >= rounds.length && rounds.length > 0) {
      setCardIndex(rounds.length - 1);
    }
  }, [cardIndex, rounds.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  const activeRound = rounds[cardIndex];
  const activeClue = store.dailyRounds[activeRound?.roundIndex ?? 0]?.clue;

  return (
    <div
      className={`ag-results${embedded ? " ag-results--embedded" : ""}`}
      style={embedded ? undefined : { marginTop: "20px" }}
    >
      <div className="ag-results-header">
        <div className="ag-results-kicker">Daily Complete</div>
        <div className="ag-results-total">
          <span className="ag-results-total-label">Total Score</span>
          <span className={`ag-results-total-value${isWin ? " ag-results-total-value--win" : ""}`}>
            {displayScore}
          </span>
        </div>
      </div>

      {activeRound && activeClue ? (
        <div className="ag-results-carousel">
          <RoundResultCard
            key={activeRound.roundIndex}
            round={activeRound}
            clue={activeClue}
          />

          <div className="ag-results-nav">
            <button
              type="button"
              className="ag-results-nav-btn"
              onClick={goPrev}
              disabled={cardIndex === 0}
              aria-label="Previous round"
            >
              ←
            </button>

            <div className="ag-results-dots" role="tablist" aria-label="Round results">
              {rounds.map((round, i) => (
                <button
                  key={round.roundIndex}
                  type="button"
                  role="tab"
                  aria-selected={i === cardIndex}
                  aria-label={`Round ${i + 1}`}
                  className={`ag-results-dot${i === cardIndex ? " ag-results-dot--active" : ""}${
                    round.exact ? " ag-results-dot--exact" : round.surrendered ? " ag-results-dot--miss" : ""
                  }`}
                  onClick={() => setCardIndex(i)}
                />
              ))}
            </div>

            <button
              type="button"
              className="ag-results-nav-btn"
              onClick={goNext}
              disabled={cardIndex >= rounds.length - 1}
              aria-label="Next round"
            >
              →
            </button>
          </div>

          <div className="ag-results-counter">
            Round {cardIndex + 1} of {rounds.length}
          </div>
        </div>
      ) : null}

      <OtherDailies currentGameId="anyguessr" />

      <div className="ag-results-footer">
        Come back tomorrow · {getDateString()}
      </div>
    </div>
  );
}

function RoundResultCard({
  round,
  clue,
}: {
  round: DailyRoundResult;
  clue: { type: string; content: string; metadata?: import("@/lib/anyguessr/types").ClueMetadata };
}) {
  const label =
    DAILY_CLUE_TYPE_LABEL[round.clueType as keyof typeof DAILY_CLUE_TYPE_LABEL] ??
    round.clueType;

  const scoreLabel = round.surrendered
    ? "0 pts"
    : round.exact
      ? `+${round.roundScore} · exact`
      : `+${round.roundScore} · ${formatDistanceKm(round.distanceKm)} off`;

  return (
    <article className="ag-results-card anim-fade-slide-up">
      <div className="ag-results-card-label">
        Round {round.roundIndex + 1} · {label}
      </div>

      <div className="ag-results-clue">
        <ClueCard
          clue={clue}
          index={round.roundIndex}
          revealed
          headerLabel={`${label} clue`}
        />
      </div>

      <div className="ag-results-compare">
        <CompareCell
          label="You guessed"
          value={round.surrendered ? "Gave up" : round.guess || "—"}
          tone={round.surrendered ? "muted" : round.exact ? "good" : "bad"}
        />
        <CompareCell
          label="Answer"
          value={round.answer}
          flagUrl={round.flagUrl}
          tone="answer"
        />
      </div>

      <div className={`ag-results-round-score${round.exact ? " ag-results-round-score--exact" : ""}`}>
        {scoreLabel}
      </div>
    </article>
  );
}

function CompareCell({
  label,
  value,
  flagUrl,
  tone,
}: {
  label: string;
  value: string;
  flagUrl?: string;
  tone: "good" | "bad" | "muted" | "answer";
}) {
  return (
    <div className={`ag-results-compare-cell ag-results-compare-cell--${tone}`}>
      <div className="ag-results-compare-label">{label}</div>
      <div className="ag-results-compare-value">
        {flagUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={flagUrl} alt="" className="ag-results-flag" />
        ) : null}
        <span>{value}</span>
      </div>
    </div>
  );
}
