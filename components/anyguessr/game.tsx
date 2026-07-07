"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DAILY_CLUE_TYPE_LABEL, DAILY_ROUND_COUNT } from "@/lib/anyguessr/daily";
import { useAnyGuessrStore } from "@/lib/anyguessr/store";
import { useSound } from "@/lib/audio/sound-context";
import { fireConfetti } from "@/lib/motion/confetti";
import { GameBackLink } from "@/components/ui/game-back-link";
import { SoundToggle } from "@/components/ui/sound-toggle";
import { WinStreakLine } from "@/components/streak/streak-notifier";
import ClueCard from "./clue-card";
import CountryPicker from "./country-picker";
import ProgressDots from "./progress-dots";
import Results from "./results";
import RoundRecap from "./round-recap";

function getDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function AnyGuessrGame() {
  const store = useAnyGuessrStore();
  const { play } = useSound();
  const celebratedRef = useRef(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);
  const [showResultsOverlay, setShowResultsOverlay] = useState(false);
  const [mounted, setMounted] = useState(false);

  const loading = store.loading;
  const date = store.date;
  const status = store.status;
  const feedback = store.feedback;
  const initPuzzle = store.initPuzzle;

  const isOver = status === "won";
  const displayScore = store.totalScore;
  const dailyRound = store.dailyRounds[store.currentRound] ?? null;
  const roundsComplete = store.roundResults.length;
  const showRoundRecap = !!store.roundRecap;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOver || showRoundRecap) {
      setShowResultsOverlay(false);
      return;
    }
    const timer = setTimeout(() => setShowResultsOverlay(true), 400);
    return () => clearTimeout(timer);
  }, [isOver, showRoundRecap]);

  useEffect(() => {
    if (status !== "won" || celebratedRef.current) return;
    if (!isOver) return;
    celebratedRef.current = true;
    play("win");
    void fireConfetti("gold");
  }, [status, play, isOver]);

  useEffect(() => {
    if (status === "playing") {
      celebratedRef.current = false;
    }
  }, [status]);

  useEffect(() => {
    const hydrate = () => initPuzzle();
    if (useAnyGuessrStore.persist.hasHydrated()) {
      hydrate();
    } else {
      return useAnyGuessrStore.persist.onFinishHydration(hydrate);
    }
  }, [initPuzzle]);

  useEffect(() => {
    if (!feedback || showRoundRecap) return;
    const delay =
      feedback.type === "correct"
        ? 1500
        : feedback.type === "wrong"
          ? 2200
          : 2200;
    const t = setTimeout(() => store.clearFeedback(), delay);
    return () => clearTimeout(t);
  }, [feedback, store, showRoundRecap]);

  const handlePick = (name: string) => {
    setPickerOpen(false);
    play("ui.tap");
    void store.submitDailyGuess(name);
  };

  const isLoading = loading || store.dailyRounds.length === 0;

  if (isLoading) {
    return (
      <div style={{ width: "100%", maxWidth: "560px", margin: "0 auto" }}>
        <header style={{ position: "relative", marginBottom: "24px" }}>
          <GameBackLink color="var(--ag-muted)" />
        </header>
        <div
          style={{
            minHeight: "320px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ag-muted)",
            fontSize: "13px",
          }}
        >
          Loading puzzle…
        </div>
      </div>
    );
  }

  const dailyRoundLabel =
    dailyRound &&
    `Round ${dailyRound.roundIndex + 1} · ${
      DAILY_CLUE_TYPE_LABEL[dailyRound.clueType as keyof typeof DAILY_CLUE_TYPE_LABEL] ??
      dailyRound.clueType
    }`;

  return (
    <div style={{ width: "100%", maxWidth: "560px", margin: "0 auto" }}>
      <header style={{ textAlign: "center", marginBottom: "24px", position: "relative" }}>
        <GameBackLink color="var(--ag-muted)" />
        <div style={{ position: "absolute", top: 0, right: 0 }}>
          <SoundToggle />
        </div>
        <h1
          style={{
            fontSize: "clamp(26px, 5.5vw, 34px)",
            fontWeight: 800,
            color: "var(--ag-text)",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          AnyGuessr
        </h1>
        <p
          style={{
            fontSize: "11px",
            color: "var(--ag-muted)",
            margin: "6px 0 14px",
            letterSpacing: "0.04em",
          }}
        >
          Nine countries — one clue each. Score by how close you guess.
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
          }}
        >
          <ScorePill value={displayScore} />
          <span style={{ fontSize: "11px", color: "var(--ag-muted)" }}>
            {formatDate(date || getDateString())}
          </span>
          <span
            style={{
              fontSize: "10px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ag-muted)",
            }}
          >
            Daily
          </span>
        </div>
      </header>

      <div style={{ marginBottom: "16px" }}>
        {dailyRound ? (
          <>
            <ClueCard
              clue={dailyRound.clue}
              index={dailyRound.roundIndex}
              revealed
              headerLabel={dailyRoundLabel ?? undefined}
            />
            <div style={{ marginTop: "20px" }}>
              <ProgressDots
                current={Math.max(roundsComplete, store.currentRound + 1)}
                total={DAILY_ROUND_COUNT}
                active={store.currentRound}
              />
            </div>
          </>
        ) : null}
      </div>

      {feedback && !showRoundRecap && (
        <div
          className={!isOver && feedback.type === "round" ? undefined : "anim-pop-in"}
          style={{
            textAlign: "center",
            padding: !isOver ? "6px 10px" : "10px 14px",
            marginBottom: !isOver ? "12px" : "16px",
            fontSize: !isOver ? "11px" : "13px",
            fontWeight: !isOver ? 500 : 600,
            color:
              feedback.type === "correct"
                ? "var(--ag-accent)"
                : feedback.type === "wrong"
                  ? "#ff6b6b"
                  : "var(--ag-muted)",
            background:
              feedback.type === "correct"
                ? "rgba(224,168,88,0.08)"
                : feedback.type === "wrong"
                  ? "rgba(255,107,107,0.08)"
                  : !isOver
                    ? "transparent"
                    : "var(--ag-surface-hi)",
            border: `1px solid ${
              feedback.type === "correct"
                ? "rgba(224,168,88,0.2)"
                : feedback.type === "wrong"
                  ? "rgba(255,107,107,0.18)"
                  : !isOver
                    ? "var(--ag-border-faint)"
                    : "var(--ag-border)"
            }`,
            borderRadius: !isOver ? "6px" : "8px",
          }}
        >
          {feedback.message}
        </div>
      )}

      {!isOver && !showRoundRecap && (
        <div
          style={{
            display: "flex",
            gap: "10px",
            flexDirection: "column",
            marginBottom: "16px",
          }}
        >
          <button
            onClick={() => {
              play("ui.tap");
              setPickerKey((k) => k + 1);
              setPickerOpen(true);
            }}
            style={primaryBtnStyle}
          >
            Guess Country
          </button>

          <button
            onClick={() => {
              play("ui.tap");
              if (confirm("Give up this round? You'll score 0 points.")) {
                void store.surrender();
              }
            }}
            style={{
              ...secondaryBtnStyle,
              color: "#ff6b6b",
              borderColor: "rgba(255,107,107,0.18)",
            }}
          >
            Give Up
          </button>
        </div>
      )}

      <CountryPicker
        key={pickerKey}
        open={pickerOpen}
        roundKey={store.currentRound}
        onClose={() => setPickerOpen(false)}
        onPick={handlePick}
      />

      {mounted &&
        showRoundRecap &&
        store.roundRecap &&
        createPortal(
          <div
            className="anim-fade-slide-up"
            role="dialog"
            aria-modal="true"
            aria-label="Round results"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              background: "rgba(7, 9, 15, 0.92)",
              overflowY: "auto",
            }}
          >
            <div style={{ width: "100%", maxWidth: "440px" }}>
              <RoundRecap
                recap={store.roundRecap}
                totalScore={store.totalScore}
                onContinue={() => {
                  play("ui.tap");
                  store.continueDailyRound();
                }}
              />
            </div>
          </div>,
          document.body,
        )}

      {mounted &&
        showResultsOverlay &&
        createPortal(
          <div
            className="anim-fade-slide-up"
            role="dialog"
            aria-modal="true"
            aria-label="Puzzle results"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              background: "rgba(7, 9, 15, 0.92)",
              overflowY: "auto",
            }}
          >
            <div style={{ width: "100%", maxWidth: "440px" }}>
              <Results scoreActive embedded />
              {status === "won" && (
                <WinStreakLine gameId="anyguessr" accentColor="var(--ag-accent)" />
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function ScorePill({ value }: { value: number }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 12px",
        border: "1px solid var(--ag-border-hi)",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 700,
        color: "var(--ag-accent)",
      }}
    >
      Score: {value}
    </div>
  );
}

const BASE_BTN: React.CSSProperties = {
  padding: "12px 18px",
  fontSize: "13px",
  fontWeight: 600,
  letterSpacing: "0.04em",
  borderRadius: "10px",
  cursor: "pointer",
  border: "none",
  transition: "transform 0.12s ease, opacity 0.2s ease",
};
const primaryBtnStyle: React.CSSProperties = {
  ...BASE_BTN,
  background: "var(--ag-accent)",
  color: "#0b0e1c",
  width: "100%",
};
const secondaryBtnStyle: React.CSSProperties = {
  ...BASE_BTN,
  background: "var(--ag-surface-hi)",
  color: "var(--ag-text)",
  border: "1px solid var(--ag-border)",
};
