"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { LINEUP_ROUNDS } from "@/lib/anyguessr/lineup";
import { roundStreak } from "@/lib/anyguessr/reveal";
import { useAnyGuessrStore } from "@/lib/anyguessr/store";
import { useSound } from "@/lib/audio/sound-context";
import { fireConfetti } from "@/lib/motion/confetti";
import { burstFrom } from "@/lib/motion/burst";
import { impactRing } from "@/lib/motion/impact-ring";
import { GameHowItWorksModal } from "@/components/ui/game-how-it-works-modal";
import { GameTitle } from "@/components/ui/game-title";
import { DailyCompleteOverlay } from "@/components/daily/daily-complete-overlay";
import { useGameHowItWorks } from "@/lib/game-how-it-works";
import { WinStreakLine } from "@/components/streak/streak-notifier";
import ClueCard, { type ClueView } from "./clue-card";
import { GuessDock } from "./guess-dock";
import Results from "./results";
import RoundRecap from "./round-recap";
import { Stamps } from "./stamps";
import WorldMap, { type MapSelection } from "./world-map";

export default function AnyGuessrGame() {
  const store = useAnyGuessrStore();
  const { play } = useSound();
  const celebratedRef = useRef(false);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<ClueView>("both");
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);
  const playedThisVisitRef = useRef(false);
  const [showResultsOverlay, setShowResultsOverlay] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Starts false on the server and in the browser alike, so the first render matches the
  // server's HTML. The effect below switches it on once saved progress has loaded.
  const [storeReady, setStoreReady] = useState(false);
  const { showHowItWorks, dismissHowItWorks } = useGameHowItWorks("anyguessr");

  const loading = store.loading;
  const status = store.status;
  const feedback = store.feedback;
  const initPuzzle = store.initPuzzle;

  const isOver = status === "won";
  const displayScore = store.totalScore;
  const dailyRound = store.dailyRounds[store.currentRound] ?? null;
  const showRoundRecap = !!store.roundRecap;
  // The round just played stamps the passport when its recap closes, not while it is still playing out.
  const stampedResults = showRoundRecap ? store.roundResults.slice(0, -1) : store.roundResults;

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
    if (!playedThisVisitRef.current) return;
    play("win");
    void fireConfetti("gold");
  }, [status, play, isOver]);

  useEffect(() => {
    if (status === "playing") {
      celebratedRef.current = false;
      // A finished puzzle is restored on every visit; only one finished now is celebrated.
      if (storeReady && !loading && store.dailyRounds.length > 0) playedThisVisitRef.current = true;
    }
  }, [status, storeReady, loading, store.dailyRounds.length]);

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

  useEffect(() => {
    if (!feedback || showRoundRecap || feedback.type !== "correct") return;
    impactRing(feedbackRef.current, "var(--ag-accent)");
    void burstFrom(feedbackRef.current, 1, "gold");
  }, [feedback, showRoundRecap]);

  const handlePick = (name: string) => {
    if (submitting) return;
    play("ui.tap");
    setSubmitting(true);
    void store.submitDailyGuess(name).finally(() => {
      setSubmitting(false);
      setSelection(null);
      setView("both");
    });
  };

  const handleMapSelect = (next: MapSelection | null) => {
    if (isOver || showRoundRecap) return;
    if (next) play("ui.tap");
    setSelection(next);
  };

  const isLoading = !storeReady || loading || (store.dailyRounds.length === 0 && !feedback);

  const dailyUnavailable =
    !loading &&
    store.dailyRounds.length === 0 &&
    feedback?.type === "info" &&
    (feedback.message.includes("isn't ready") ||
      feedback.message.includes("No daily puzzle"));

  const howItWorksModal = showHowItWorks ? (
    <GameHowItWorksModal
      subtitle={`${store.dailyRounds.length || LINEUP_ROUNDS} rounds · One puzzle a day`}
      rules={ANYGUESSR_HOW_IT_WORKS}
      onDismiss={() => {
        dismissHowItWorks();
        play("ui.tap");
      }}
      theme={{
        overlay: "var(--ag-overlay)",
        surface: "var(--ag-surface)",
        border: "var(--ag-border)",
        accent: "var(--ag-accent)",
        text: "var(--ag-text)",
        textMuted: "var(--ag-muted)",
      }}
    />
  ) : null;

  const totalRounds = store.dailyRounds.length || LINEUP_ROUNDS;
  const canGuess = !isOver && !showRoundRecap && Boolean(dailyRound);

  const header = (
    <header className="ag-top">
      <div className="ag-head">
        <Link href="/" className="ag-back">
          &larr; Back
        </Link>
        <GameTitle game="anyguessr" as="h1" className="ag-title" />
        <div className="ag-stats">
          {dailyRound && (
            <span>
              Round
              <b>{Math.min(store.currentRound + 1, totalRounds)}</b>/ {totalRounds}
            </span>
          )}
          <span>
            Score
            <b>{displayScore}</b>
          </span>
        </div>
      </div>
      {store.dailyRounds.length > 0 && (
        <Stamps total={totalRounds} results={stampedResults} current={isOver ? -1 : store.currentRound} />
      )}
    </header>
  );

  if (isLoading || dailyUnavailable) {
    return (
      <div className="ag-stage">
        {howItWorksModal}
        {header}
        <div className="ag-notice">
          {isLoading ? (
            "Loading puzzle…"
          ) : (
            <>
              <b>No daily puzzle today</b>
              <p>{feedback?.message ?? "The puzzle pool can't fill every daily round yet."}</p>
              <button type="button" className="ag-quiet-btn" onClick={() => void initPuzzle()}>
                Try again
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="ag-stage" data-view={dailyRound && !isOver ? view : "map"}>
      {howItWorksModal}

      <div className="ag-map-layer">
        <WorldMap selection={selection} onSelect={handleMapSelect} inset={MAP_INSET} />
      </div>

      {header}

      {dailyRound && !isOver && <ClueCard key={dailyRound.puzzleId} clue={dailyRound.clue} view={view} onView={setView} />}

      {feedback && !showRoundRecap && (
        <div
          ref={feedbackRef}
          className={`ag-toast is-${feedback.type} ${feedback.type === "wrong" ? "anim-shake" : "anim-pop-in"}`}
        >
          {feedback.message}
        </div>
      )}

      {canGuess && view === "clue" && (
        <button type="button" className="ag-cta ag-to-map" onClick={() => setView("both")}>
          Back to the map
        </button>
      )}

      {canGuess && (
        <div className="ag-controls">
          <GuessDock key={store.currentRound} selection={selection} onSelect={setSelection} onConfirm={handlePick} busy={submitting} />
          {confirmGiveUp ? (
            <span className="ag-giveup">
              Score 0 for this round?
              <button
                type="button"
                onClick={() => {
                  setConfirmGiveUp(false);
                  void store.surrender();
                }}
              >
                Yes, give up
              </button>
              <button type="button" onClick={() => setConfirmGiveUp(false)}>
                Keep playing
              </button>
            </span>
          ) : (
            <span className="ag-giveup">
              <button
                type="button"
                onClick={() => {
                  play("ui.tap");
                  setConfirmGiveUp(true);
                }}
              >
                Give up this round
              </button>
            </span>
          )}
        </div>
      )}

      {isOver && !showResultsOverlay && !showRoundRecap && (
        <button type="button" className="ag-cta ag-to-map" onClick={() => setShowResultsOverlay(true)}>
          See your results
        </button>
      )}

      {mounted &&
        showRoundRecap &&
        store.roundRecap &&
        createPortal(
          <div className="ag-recap-scrim" role="dialog" aria-modal="true" aria-label="Round results">
            <RoundRecap
              recap={store.roundRecap}
              totalScore={store.totalScore}
              streak={roundStreak(store.roundResults)}
              onContinue={() => {
                play("ui.tap");
                store.continueDailyRound();
              }}
            />
          </div>,
          document.body,
        )}

      <DailyCompleteOverlay
        open={mounted && showResultsOverlay}
        onClose={() => setShowResultsOverlay(false)}
        ariaLabel="Puzzle results"
        style={
          {
            "--bg": "var(--ag-bg)",
            "--text": "var(--ag-text)",
            "--text-dim": "var(--ag-muted)",
            background: "var(--ag-bg)",
            color: "var(--ag-text)",
          } as CSSProperties
        }
      >
        <Results scoreActive embedded />
        {status === "won" && <WinStreakLine gameId="anyguessr" accentColor="var(--ag-accent)" />}
      </DailyCompleteOverlay>
    </div>
  );
}

/** Space the map leaves clear for the header and the guess bar when it frames the world. */
const MAP_INSET = { top: 170, bottom: 120 };

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
