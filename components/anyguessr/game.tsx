"use client";

import { useEffect, useRef, useState } from "react";
import { useAnyGuessrStore } from "@/lib/anyguessr/store";
import type { GameMode } from "@/lib/anyguessr/types";
import { useSound } from "@/lib/audio/sound-context";
import { fireConfetti } from "@/lib/motion/confetti";
import { SoundToggle } from "@/components/ui/sound-toggle";
import ClueViewer from "./clue-viewer";
import Results from "./results";
import { WinStreakLine } from "@/components/streak/streak-notifier";
import CountryPicker from "./country-picker";

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

  const {
    loading,
    date,
    clues,
    totalClues,
    revealedCount,
    score,
    status,
    feedback,
    puzzleId,
    initPuzzle,
    submitGuess,
    revealNextClue,
    surrender,
    clearFeedback,
    nextRound,
  } = store;

  const isOver = status === "won" || status === "surrendered";

  useEffect(() => {
    if (!isOver) {
      setShowResultsOverlay(false);
      return;
    }
    const timer = setTimeout(() => setShowResultsOverlay(true), 1000);
    return () => clearTimeout(timer);
  }, [isOver]);

  useEffect(() => {
    if (status !== "won" || celebratedRef.current) return;
    celebratedRef.current = true;
    play("win");
    void fireConfetti("gold");
  }, [status, play]);

  useEffect(() => {
    if (status === "playing") {
      celebratedRef.current = false;
    }
  }, [status]);

  // Hydration + initial fetch
  useEffect(() => {
    const hydrate = () => initPuzzle(mode);
    if (useAnyGuessrStore.persist.hasHydrated()) {
      hydrate();
    } else {
      return useAnyGuessrStore.persist.onFinishHydration(hydrate);
    }
  }, [mode, initPuzzle]);

  // Feedback auto-dismiss
  useEffect(() => {
    if (!feedback) return;
    const delay = feedback.type === "correct" ? 1500 : 2200;
    const t = setTimeout(() => clearFeedback(), delay);
    return () => clearTimeout(t);
  }, [feedback, clearFeedback]);

  const handleReveal = () => {
    play("ui.tap");
    revealNextClue();
  };

  const handlePick = (name: string) => {
    setPickerOpen(false);
    play("ui.tap");
    void submitGuess(name);
  };

  if (loading && clues.length === 0) {
    return (
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
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: "560px", margin: "0 auto" }}>
      {/* Header */}
      <header style={{ textAlign: "center", marginBottom: "24px", position: "relative" }}>
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
          Guess the {store.answerType ?? "country"} from cultural clues
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
          }}
        >
          <ScorePill value={score} />
          {mode === "daily" && (
            <span style={{ fontSize: "11px", color: "var(--ag-muted)" }}>
              {formatDate(date || getDateString())}
            </span>
          )}
          <ModeTag mode={mode} />
        </div>
      </header>

      {/* Clues + results overlay */}
      <div style={{ position: "relative", marginBottom: "16px" }}>
        <ClueViewer
          clues={clues}
          revealedCount={revealedCount}
          totalClues={totalClues}
          puzzleId={puzzleId}
          onNavigate={() => play("ui.tap")}
        />

        {showResultsOverlay && (
          <div
            className="anim-fade-slide-up"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              background: "rgba(7, 9, 15, 0.92)",
              borderRadius: "14px",
              overflowY: "auto",
            }}
          >
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
        )}
      </div>

      {/* Feedback banner */}
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

      {/* Action buttons */}
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
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleReveal}
              disabled={revealedCount >= totalClues}
              style={{
                ...secondaryBtnStyle,
                flex: 1,
                opacity: revealedCount >= totalClues ? 0.4 : 1,
                cursor: revealedCount >= totalClues ? "not-allowed" : "pointer",
              }}
            >
              {revealedCount >= totalClues ? "All clues revealed" : "Reveal Next Clue"}
            </button>
            <button
              onClick={() => {
                play("ui.tap");
                if (confirm("Give up? Your score will reset to 0.")) {
                  void surrender();
                }
              }}
              style={{
                ...secondaryBtnStyle,
                flex: 1,
                color: "#ff6b6b",
                borderColor: "rgba(255,107,107,0.3)",
              }}
            >
              Give Up
            </button>
          </div>
        </div>
      )}

      <CountryPicker
        key={pickerKey}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={handlePick}
      />
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