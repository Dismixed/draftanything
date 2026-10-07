"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import ClueCard from "@/components/anyguessr/clue-card";
import { stampTone } from "@/components/anyguessr/stamps";
import { OtherDailies } from "@/components/daily/other-dailies";
import { ShareResult } from "@/components/daily/share-result";
import { anyGuessrShare } from "@/lib/share/results";
import { DAILY_CLUE_TYPE_LABEL, DAILY_MAX_ROUND_SCORE, formatDistanceKm } from "@/lib/anyguessr/daily";
import { useCountUp } from "@/lib/motion/count-up";
import { useAnyGuessrStore } from "@/lib/anyguessr/store";
import type { ClientClue, DailyRoundResult } from "@/lib/anyguessr/types";

// A fixed tilt per stamp, so the page looks hand-stamped but does not jump between renders.
const TILTS = [-7, 5, -4, 8, -6, 4, -8, 6, -3, 7];

function count(n: number, word: string): string {
  return `${n} ${word}`;
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

  const displayScore = useCountUp(store.totalScore, scoreActive ?? isWin, 900);

  const goPrev = useCallback(() => {
    setCardIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setCardIndex((i) => Math.min(rounds.length - 1, i + 1));
  }, [rounds.length]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") goPrev();
      if (event.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  const shown = Math.min(cardIndex, Math.max(0, rounds.length - 1));
  const activeRound = rounds[shown];
  const activeClue = store.dailyRounds[activeRound?.roundIndex ?? 0]?.clue;

  const tones = rounds.map(stampTone);
  const tally = [
    count(tones.filter((t) => t === "exact").length, "exact"),
    count(tones.filter((t) => t === "close").length, "close"),
    count(tones.filter((t) => t === "far").length, "far off"),
  ].join(" · ");

  return (
    <div className={`ag-results${embedded ? " is-embedded" : ""}`}>
      <header className="ag-results-head">
        <p className="ag-results-kicker">Daily complete</p>
        <div className="ag-results-score">
          {displayScore}
          <span>/ {rounds.length * DAILY_MAX_ROUND_SCORE}</span>
        </div>
        <p className="ag-results-tally">{tally}</p>
      </header>

      {/* The run as a passport page. Each stamp opens that round below. */}
      <div className="ag-passport" role="tablist" aria-label="Rounds">
        {rounds.map((round, i) => (
          <button
            key={round.roundIndex}
            type="button"
            role="tab"
            aria-selected={i === shown}
            className={`ag-pass${i === shown ? " is-open" : ""}`}
            onClick={() => setCardIndex(i)}
          >
            <span
              className={`ag-stamp is-got is-${tones[i]}`}
              style={{ "--tilt": `${TILTS[i % TILTS.length]}deg`, animationDelay: `${i * 70}ms` } as CSSProperties}
            >
              {round.flagUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={round.flagUrl} alt="" />
              ) : (
                <span className="ag-stamp-code">{round.answer.slice(0, 3)}</span>
              )}
              <b>{round.roundScore}</b>
            </span>
            <span className="ag-pass-name">{round.answer}</span>
          </button>
        ))}
      </div>

      {activeRound && activeClue ? (
        <RoundDetail
          key={activeRound.roundIndex}
          round={activeRound}
          clue={activeClue}
          onPrev={shown > 0 ? goPrev : undefined}
          onNext={shown < rounds.length - 1 ? goNext : undefined}
        />
      ) : null}

      <div className="ag-results-actions">
        <ShareResult gameId="anyguessr" text={anyGuessrShare(rounds, store.totalScore, store.date)} />
      </div>
      <OtherDailies currentGameId="anyguessr" />

      <p className="ag-results-foot">A new set of countries arrives tomorrow.</p>
    </div>
  );
}

function RoundDetail({
  round,
  clue,
  onPrev,
  onNext,
}: {
  round: DailyRoundResult;
  clue: ClientClue;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const label = DAILY_CLUE_TYPE_LABEL[round.clueType as keyof typeof DAILY_CLUE_TYPE_LABEL] ?? round.clueType;
  const tone = stampTone(round);

  return (
    <article className={`ag-round anim-fade-slide-up is-${tone}`} role="tabpanel">
      <div className="ag-round-clue">
        <ClueCard clue={clue} label={`Round ${round.roundIndex + 1}`} />
      </div>

      <div className="ag-round-info">
        <p className="ag-round-kind">
          <b>Round {round.roundIndex + 1}</b>
          {label}
        </p>
        <h3 className="ag-round-answer">
          {round.flagUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={round.flagUrl} alt="" />
          )}
          {round.answer}
        </h3>
        <p className="ag-round-guess">
          {round.surrendered ? (
            "You gave up this round"
          ) : round.exact ? (
            "You got it exactly"
          ) : (
            <>
              You guessed <b>{round.guess || "nothing"}</b>
            </>
          )}
        </p>

        <div className="ag-round-stats">
          <div>
            <b>{round.surrendered ? "—" : round.exact ? "0 km" : formatDistanceKm(round.distanceKm)}</b>
            <span>Distance</span>
          </div>
          <div>
            <b className="is-score">{round.surrendered ? "0" : `+${round.roundScore}`}</b>
            <span>Score</span>
          </div>
        </div>

        <div className="ag-round-nav">
          <button type="button" onClick={onPrev} disabled={!onPrev} aria-label="Previous round">
            &larr;
          </button>
          <button type="button" onClick={onNext} disabled={!onNext} aria-label="Next round">
            &rarr;
          </button>
        </div>
      </div>
    </article>
  );
}
