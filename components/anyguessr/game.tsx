"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DAILY_CLUE_TYPE_LABEL, DAILY_ROUND_COUNT } from "@/lib/anyguessr/daily";
import { useAnyGuessrStore } from "@/lib/anyguessr/store";
import type { GameMode } from "@/lib/anyguessr/types";
import { useSound } from "@/lib/audio/sound-context";
import { fireConfetti } from "@/lib/motion/confetti";
import { GameBackLink } from "@/components/ui/game-back-link";
import { SoundToggle } from "@/components/ui/sound-toggle";
import { WinStreakLine } from "@/components/streak/streak-notifier";
import ClueCard from "./clue-card";
import ClueViewer from "./clue-viewer";
import CountryPicker from "./country-picker";
import ProgressDots from "./progress-dots";
import Results from "./results";

interface Props {
  mode?: GameMode;
}

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

export default function AnyGuessrGame({ mode = "daily" }: Props) {
  const store = useAnyGuessrStore();
  const { play } = useSound();
  const celebratedRef = useRef(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);
  const [showResultsOverlay, setShowResultsOverlay] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isDaily = mode === "daily" && store.mode === "daily";
  const isInfinite = mode === "infinite" && store.mode === "infinite";

  const loading = store.loading;
  const date = store.date;
  const status = store.status;
  const feedback = store.feedback;
  const puzzleId = store.puzzleId;
  const initPuzzle = store.initPuzzle;
  const clearFeedback = store.clearFeedback;
  const nextRound = store.nextRound;

  const isOver = isDaily
    ? status === "won"
    : isInfinite
      ? status === "won" || status === "surrendered"
      : false;

  const displayScore = isDaily ? store.totalScore : isInfinite ? store.score : 0;

  const dailyRound = isDaily ? store.dailyRounds[store.currentRound] : null;
  const roundsComplete = isDaily ? store.roundResults.length : 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOver) {
      setShowResultsOverlay(false);
      return;
    }
    const timer = setTimeout(() => setShowResultsOverlay(true), isDaily ? 1400 : 1000);
    return () => clearTimeout(timer);
  }, [isOver, isDaily]);

  useEffect(() => {
    if (status !== "won" || celebratedRef.current) return;
    if (isDaily && store.roundResults.every((r) => !r.exact)) return;
    celebratedRef.current = true;
    play("win");
    void fireConfetti("gold");
  }, [status, play, isDaily, store.roundResults]);

  useEffect(() => {
    if (status === "playing") {
      celebratedRef.current = false;
    }
  }, [status]);

  useEffect(() => {
    const hydrate = () => initPuzzle(mode);
    if (useAnyGuessrStore.persist.hasHydrated()) {
      hydrate();
    } else {
      return useAnyGuessrStore.persist.onFinishHydration(hydrate);
    }
  }, [mode, initPuzzle]);

  useEffect(() => {
    if (!feedback) return;
    const delay =
      feedback.type === "correct" ? 1500 : feedback.type === "round" ? 1800 : 2200;
    const t = setTimeout(() => clearFeedback(), delay);
    return () => clearTimeout(t);
  }, [feedback, clearFeedback]);

  const handlePick = (name: string) => {
    setPickerOpen(false);
    play("ui.tap");
    if (isDaily) {
      void store.submitDailyGuess(name);
      return;
    }
    void store.submitGuess(name);
  };

  const isLoading =
    loading ||
    (isDaily && store.dailyRounds.length === 0) ||
    (isInfinite && store.clues.length === 0);

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
          {isDaily
            ? "Five rounds — guess the country from each clue"
            : `Guess the ${store.answerType ?? "country"} from cultural clues`}
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
          {mode === "daily" && (
            <span style={{ fontSize: "11px", color: "var(--ag-muted)" }}>
              {formatDate(date || getDateString())}
            </span>
          )}
          <ModeTag mode={mode} />
        </div>
      </header>

      <div style={{ marginBottom: "16px" }}>
        {isDaily && dailyRound ? (
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
        ) : isInfinite ? (
          <ClueViewer
            clues={store.clues}
            revealedCount={store.revealedCount}
            totalClues={store.totalClues}
            puzzleId={puzzleId}
            onNavigate={() => play("ui.tap")}
          />
        ) : null}
      </div>

      {feedback && (
        <div
          className="anim-pop-in"
          style={{
            textAlign: "center",
            padding: "10px 14px",
            marginBottom: "16px",
            fontSize: "13px",
            fontWeight: 600,
            color:
              feedback.type === "correct"
                ? "var(--ag-accent)"
                : feedback.type === "wrong"
                  ? "#ff6b6b"
                  : "var(--ag-text)",
            background:
              feedback.type === "correct"
                ? "rgba(224,168,88,0.08)"
                : feedback.type === "wrong"
                  ? "rgba(255,107,107,0.08)"
                  : "var(--ag-surface-hi)",
            border: `1px solid ${
              feedback.type === "correct"
                ? "rgba(224,168,88,0.2)"
                : feedback.type === "wrong"
                  ? "rgba(255,107,107,0.18)"
                  : "var(--ag-border)"
            }`,
            borderRadius: "8px",
          }}
        >
          {feedback.message}
        </div>
      )}

      {!isOver && (
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

          {isInfinite && (
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => {
                  play("ui.tap");
                  store.revealNextClue();
                }}
                disabled={store.revealedCount >= store.totalClues}
                style={{
                  ...secondaryBtnStyle,
                  flex: 1,
                  opacity: store.revealedCount >= store.totalClues ? 0.4 : 1,
                  cursor:
                    store.revealedCount >= store.totalClues ? "not-allowed" : "pointer",
                }}
              >
                {store.revealedCount >= store.totalClues
                  ? "All clues revealed"
                  : "Reveal Next Clue"}
              </button>
              <button
                onClick={() => {
                  play("ui.tap");
                  if (confirm("Give up? Your score will reset to 0.")) {
                    void store.surrender();
                  }
                }}
                style={{
                  ...secondaryBtnStyle,
                  flex: 1,
                  color: "#ff6b6b",
                  borderColor: "rgba(255,107,107,0.18)",
                }}
              >
                Give Up
              </button>
            </div>
          )}
        </div>
      )}

      <CountryPicker
        key={pickerKey}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={handlePick}
      />

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
              {mode === "daily" && status === "won" && (
                <WinStreakLine gameId="anyguessr" accentColor="var(--ag-accent)" />
              )}
              {mode === "infinite" && status === "won" && (
                <div style={{ textAlign: "center", marginTop: "12px", width: "100%" }}>
                  <button
                    onClick={() => {
                      play("ui.tap");
                      void nextRound();
                    }}
                    style={primaryBtnStyle}
                  >
                    Next Round
                  </button>
                </div>
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

function ModeTag({ mode }: { mode: GameMode }) {
  return (
    <span
      style={{
        fontSize: "10px",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "var(--ag-muted)",
      }}
    >
      {mode === "daily" ? "Daily" : "Infinite"}
    </span>
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
