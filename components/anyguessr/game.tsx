"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useFeatureFlagVariant } from "@/lib/analytics/use-feature-flag";
import { clueDisplayUrl } from "@/lib/anyguessr/clue-image-url";
import { LINEUP_ROUNDS } from "@/lib/anyguessr/lineup";
import { roundStreak } from "@/lib/anyguessr/reveal";
import { useAnyGuessrStore } from "@/lib/anyguessr/store";
import { useSound } from "@/lib/audio/sound-context";
import { fireConfetti } from "@/lib/motion/confetti";
import { burstFrom } from "@/lib/motion/burst";
import { impactRing } from "@/lib/motion/impact-ring";
import { GameTitle } from "@/components/ui/game-title";
import { FinishScreen } from "@/components/daily/finish-screen";
import { useDailyIntro } from "@/lib/daily-intro/use-daily-intro";
import { finishCurve, useDailyPercentile } from "@/lib/games/use-daily-percentile";
import { anyGuessrShare } from "@/lib/share/results";
import ClueCard, { type ClueView } from "./clue-card";
import { AnyGuessrIntro } from "./intro";
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
  // Same fact as the ref, as state, so the finish is recorded once and return visits only read.
  const [playedThisVisit, setPlayedThisVisit] = useState(false);
  const [showResultsOverlay, setShowResultsOverlay] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Starts false on the server and in the browser alike, so the first render matches the
  // server's HTML. The effect below switches it on once saved progress has loaded.
  const [storeReady, setStoreReady] = useState(false);

  const loading = store.loading;
  const status = store.status;
  const feedback = store.feedback;
  const initPuzzle = store.initPuzzle;

  const isOver = status === "won";
  const displayScore = store.totalScore;
  const dailyRound = store.dailyRounds[store.currentRound] ?? null;
  const showRoundRecap = !!store.roundRecap;
  // Same condition the effect below uses for the ref, adjusted during render (React's pattern
  // for derived state) because a setState inside that effect is a lint error here.
  if (!playedThisVisit && status === "playing" && storeReady && !loading && store.dailyRounds.length > 0) {
    setPlayedThisVisit(true);
  }
  const standing = useDailyPercentile("anyguessr", store.totalScore, {
    enabled: storeReady && !loading && isOver,
    record: playedThisVisit,
  });
  // Read once the daily is over, so only players who reach the finish screen count as exposed.
  const foldRounds = useFeatureFlagVariant(FINISH_FOLD_FLAG, { enabled: isOver }) === "test";
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

  // Fetch the next round's picture during this round, so it is ready when the round starts.
  const nextClue = store.dailyRounds[store.currentRound + 1]?.clue.metadata;
  const nextImageUrl = nextClue?.image_url ?? nextClue?.thumb_url;
  useEffect(() => {
    if (nextImageUrl) new Image().src = clueDisplayUrl(nextImageUrl);
  }, [nextImageUrl]);

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

  // Typing a guess tucks the clue away, leaving the map and the suggestions clear.
  const minimiseClue = () => setView("map");
  // Scrolling or pressing the map tucks it away too, once the player starts looking around.
  const handleMapEngage = () => setView((v) => (v === "both" ? "map" : v));

  const isLoading = !storeReady || loading || (store.dailyRounds.length === 0 && !feedback);

  const dailyUnavailable =
    !loading &&
    store.dailyRounds.length === 0 &&
    feedback?.type === "info" &&
    (feedback.message.includes("isn't ready") ||
      feedback.message.includes("No daily puzzle"));

  // The intro is for a daily nobody has started: no round played yet and not finished.
  const intro = useDailyIntro("anyguessr", {
    ready: !isLoading || dailyUnavailable,
    skip: dailyUnavailable || isOver || store.currentRound > 0 || store.roundResults.length > 0,
  });

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

  if (intro.phase !== "game") {
    const first = store.dailyRounds[0];
    return (
      <AnyGuessrIntro
        pending={intro.phase === "checking"}
        teaser={first ? { firstClueType: first.clueType, rounds: store.dailyRounds.length } : null}
        onPlay={() => {
          play("ui.tap");
          intro.play();
        }}
      />
    );
  }

  if (isLoading || dailyUnavailable) {
    return (
      <div className="ag-stage">
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
      <div className="ag-map-layer">
        <WorldMap selection={selection} onSelect={handleMapSelect} onEngage={canGuess ? handleMapEngage : undefined} inset={MAP_INSET} />
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
          <GuessDock key={store.currentRound} selection={selection} onSelect={setSelection} onConfirm={handlePick} onEngage={minimiseClue} busy={submitting} />
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

      <FinishScreen
        gameId="anyguessr"
        open={mounted && showResultsOverlay}
        onClose={() => setShowResultsOverlay(false)}
        ariaLabel="Puzzle results"
        result={<Results scoreActive embedded foldRounds={foldRounds} />}
        shareText={anyGuessrShare(store.roundResults, store.totalScore, store.date)}
        curve={finishCurve("anyguessr", standing)}
        theme={{ "--fin-result-w": "640px" } as CSSProperties}
      />
    </div>
  );
}

/** Experiment: "test" folds the round-by-round review on the finish screen. */
const FINISH_FOLD_FLAG = "ga-anyguessr-finish-screen-collapse-the-rou-7174a5";

/** Space the map leaves clear for the header and the guess bar when it frames the world. */
const MAP_INSET = { top: 170, bottom: 120 };
