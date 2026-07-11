"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DAILY_CLUE_TYPE_LABEL, DAILY_ROUND_COUNT } from "@/lib/anyguessr/daily";
import { useAnyGuessrStore } from "@/lib/anyguessr/store";
import { useSound } from "@/lib/audio/sound-context";
import { fireConfetti } from "@/lib/motion/confetti";
import { GameBackLink } from "@/components/ui/game-back-link";
import { GameHowItWorksModal } from "@/components/ui/game-how-it-works-modal";
import { SoundToggle } from "@/components/ui/sound-toggle";
import { GameTitle } from "@/components/ui/game-title";
import { useGameHowItWorks } from "@/lib/game-how-it-works";
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
  const [storeReady, setStoreReady] = useState(
    () => typeof window !== "undefined" && useAnyGuessrStore.persist.hasHydrated(),
  );
  const { showHowItWorks, dismissHowItWorks } = useGameHowItWorks("anyguessr");

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
    const start = () => {
      setStoreReady(true);
      void initPuzzle();
    };

    if (useAnyGuessrStore.persist.hasHydrated()) {
      start();
      return;
    }

    const unsub = useAnyGuessrStore.persist.onFinishHydration(start);
    const fallback = window.setTimeout(() => {
      if (useAnyGuessrStore.persist.hasHydrated()) {
        start();
        return;
      }
      void Promise.resolve(useAnyGuessrStore.persist.rehydrate()).finally(start);
    }, 750);

    return () => {
      unsub?.();
      window.clearTimeout(fallback);
    };
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

  const isLoading =
    storeReady &&
    (loading || (store.dailyRounds.length === 0 && !feedback));

  const dailyUnavailable =
    !loading &&
    store.dailyRounds.length === 0 &&
    feedback?.type === "info" &&
    (feedback.message.includes("isn't ready") ||
      feedback.message.includes("No daily puzzle"));

  const howItWorksModal = showHowItWorks ? (
    <GameHowItWorksModal
      subtitle={`${DAILY_ROUND_COUNT} rounds · One puzzle a day`}
      rules={ANYGUESSR_HOW_IT_WORKS}
      onDismiss={() => {
        dismissHowItWorks();
        play("ui.tap");
      }}
      theme={{
        overlay: "rgba(7, 9, 15, 0.92)",
        surface: "var(--ag-surface)",
        border: "var(--ag-border)",
        accent: "var(--ag-accent)",
        text: "var(--ag-text)",
        textMuted: "var(--ag-muted)",
      }}
    />
  ) : null;

  if (isLoading) {
    return (
      <div style={{ width: "100%", maxWidth: "560px", margin: "0 auto" }}>
        {howItWorksModal}
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

  if (dailyUnavailable) {
    return (
      <div style={{ width: "100%", maxWidth: "560px", margin: "0 auto" }}>
        {howItWorksModal}
        <header style={{ position: "relative", marginBottom: "24px" }}>
          <GameBackLink color="var(--ag-muted)" />
        </header>
        <div
          style={{
            minHeight: "320px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            padding: "24px",
            textAlign: "center",
            background: "var(--ag-surface)",
            border: "1px solid var(--ag-border)",
            borderRadius: "14px",
          }}
        >
          <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--ag-text)" }}>
            No daily puzzle today
          </div>
          <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.5, color: "var(--ag-muted)", maxWidth: "360px" }}>
            {feedback?.message ??
              "The puzzle pool can't fill all ten daily rounds yet."}
          </p>
          <button
            type="button"
            onClick={() => void initPuzzle()}
            style={{
              marginTop: "4px",
              padding: "10px 18px",
              borderRadius: "8px",
              border: "1px solid var(--ag-border)",
              background: "var(--ag-surface-hi)",
              color: "var(--ag-text)",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Try again
          </button>
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
      {howItWorksModal}
      <header style={{ textAlign: "center", marginBottom: "24px", position: "relative" }}>
        <GameBackLink color="var(--ag-muted)" />
        <div style={{ position: "absolute", top: 0, right: 0 }}>
          <SoundToggle />
        </div>
        <GameTitle
          game="anyguessr"
          as="h1"
          style={{
            fontSize: "clamp(26px, 5.5vw, 34px)",
            fontWeight: 800,
            color: "var(--ag-text)",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        />
        <p
          style={{
            fontSize: "11px",
            color: "var(--ag-muted)",
            margin: "6px 0 14px",
            letterSpacing: "0.04em",
          }}
        >
          Ten countries — one clue each. Score by how close you guess.
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

      {feedback && !dailyRound && (
        <div
          style={{
            textAlign: "center",
            padding: "10px 12px",
            marginBottom: "16px",
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--ag-muted)",
            background: "var(--ag-surface-hi)",
            border: "1px solid var(--ag-border)",
            borderRadius: "8px",
          }}
        >
          {feedback.message}
        </div>
      )}

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
            <div style={{ width: "100%", maxWidth: "680px" }}>
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

const ANYGUESSR_HOW_IT_WORKS = [
  {
    title: "Ten Cultural Clues",
    body: "Each round shows a different clue — flag, currency, jersey, landmark, food, and more. Everyone gets the same puzzle today.",
  },
  {
    title: "Pin a Country",
    body: "Tap the map and pick the country you think matches the clue. You get one guess per round.",
  },
  {
    title: "Closer Is Better",
    body: "Points depend on how close your guess is. Nail it and you earn full round points; far-off guesses still earn partial credit.",
  },
  {
    title: "One Shot Per Day",
    body: "Play through all ten rounds once, then come back tomorrow for a fresh set of countries.",
  },
] as const;

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
