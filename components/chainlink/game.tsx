"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useChainlinkStore } from "@/lib/chainlink/store";
import { getDateString } from "@/lib/chainlink/puzzles";
import { summarizeChain, type ChainSummary } from "@/lib/chainlink/result-summary";
import type { GameMode } from "@/lib/chainlink/types";
import { useSound } from "@/lib/audio/sound-context";
import { fireConfetti } from "@/lib/motion/confetti";
import { triggerAnimation } from "@/lib/motion/trigger-class";
import { burstFrom } from "@/lib/motion/burst";
import { impactRing } from "@/lib/motion/impact-ring";
import { GameTitle } from "@/components/ui/game-title";
import TutorialModal from "./tutorial-modal";
import { OtherDailies } from "@/components/daily/other-dailies";
import { ShareResult } from "@/components/daily/share-result";
import { chainLinkShare } from "@/lib/share/results";
import { getDateString as shareDate } from "@/lib/streak/date";
import { DailyCompleteOverlay } from "@/components/daily/daily-complete-overlay";
import { WinStreakLine } from "@/components/streak/streak-notifier";
import { recordDailyCompletion } from "@/lib/streak/storage";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/** Pips shown in the status bar. Matches the store's allowance of four mistakes. */
const MAX_TRIES = 4;

/** The finish screen is drawn outside the game page, so it needs the game's colours handed to it. */
const OVERLAY_THEME = {
  "--bg": "var(--cl-bg)",
  "--text": "var(--cl-text)",
  "--text-dim": "var(--cl-gray-dim)",
} as React.CSSProperties;

function displayChar(ch: string, index: number): string {
  const lower = ch.toLowerCase();
  return index === 0 ? lower.charAt(0).toUpperCase() : lower;
}

function unrevealedSlotIndex(revealedLetters: boolean[], position: number): number {
  let slot = 0;
  for (let i = 1; i < position; i++) {
    if (!revealedLetters[i]) slot++;
  }
  return slot;
}

/* ------------------------------------------------------------------ */
/*  Chain Link SVG                                                     */
/* ------------------------------------------------------------------ */

function ChainLink({ state, animated }: { state: "joined" | "next" | "dim"; animated: boolean }) {
  return (
    <div className={`cl-link is-${state}${animated ? " is-growing" : ""}`} aria-hidden="true">
      <i />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Word Row — now supports revealed letters from hints                */
/* ------------------------------------------------------------------ */

function WordRow({
  word,
  index,
  status,
  nextStatus,
  previousWord,
  revealedLetters,
  revealTrigger,
  totalWords,
  onSubmitGuess,
}: {
  word: string;
  index: number;
  status: "locked" | "active" | "solved";
  nextStatus?: "locked" | "active" | "solved";
  previousWord?: string;
  revealedLetters: boolean[];
  revealTrigger: number;
  totalWords: number;
  onSubmitGuess?: (guess: string) => "correct" | "incorrect" | "already-solved" | Promise<"correct" | "incorrect" | "already-solved">;
}) {
  const chars = word.split("");
  const unrevealedCount = (word.length - 1) - revealedLetters.filter(Boolean).length;

  const [localGuess, setLocalGuess] = useState("");
  const [wrongFlash, setWrongFlash] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const { play } = useSound();

  useEffect(() => {
    if (status === "active") {
      inputRef.current?.focus();
    }
  }, [status]);

  // Clear local input when word changes
  useEffect(() => {
    setLocalGuess("");
    setWrongFlash(false);
    setSubmitting(false);
  }, [word]);

  useEffect(() => {
    if (!revealTrigger) return;
    const timer = window.setTimeout(() => {
      impactRing(rowRef.current, "var(--cl-green)");
      void burstFrom(rowRef.current, 1, "correct");
    }, 260);
    return () => window.clearTimeout(timer);
  }, [revealTrigger]);

  const buildFullGuess = useCallback((typed: string) => {
    let typedIdx = 0;
    let fullGuess = word[0].toLowerCase();
    for (let i = 1; i < word.length; i++) {
      if (revealedLetters[i]) {
        fullGuess += word[i];
      } else {
        fullGuess += typed[typedIdx] ?? "";
        typedIdx++;
      }
    }
    return fullGuess;
  }, [word, revealedLetters]);

  const isCompleteCorrectGuess = useCallback((typed: string) => {
    if (typed.length < unrevealedCount) return false;
    const normalizedGuess = buildFullGuess(typed.trim()).trim().toLowerCase().replace(/\s+/g, "");
    const normalizedTarget = word.toLowerCase().replace(/\s+/g, "");
    return normalizedGuess === normalizedTarget;
  }, [buildFullGuess, unrevealedCount, word]);

  const trySubmit = useCallback(async () => {
    if (!localGuess.trim() || !onSubmitGuess || submitting) return;
    if (localGuess.length < unrevealedCount) return;

    const fullGuess = buildFullGuess(localGuess.trim());

    setSubmitting(true);
    const result = await onSubmitGuess(fullGuess);
    setSubmitting(false);

    if (result === "correct") {
      play("correct");
      setLocalGuess("");
    } else if (result === "incorrect") {
      play("wrong");
      setLocalGuess("");
      setWrongFlash(true);
      triggerAnimation(rowRef.current, "anim-shake", 450);
      triggerAnimation(rowRef.current, "anim-flash-red", 500);
      triggerAnimation(
        rowRef.current?.closest<HTMLElement>(".cl-chain") ?? null,
        "anim-screen-shake",
        250,
      );
      window.setTimeout(() => setWrongFlash(false), 1400);
    } else if (result === "already-solved") {
      play("ui.tap");
    }
  }, [localGuess, unrevealedCount, onSubmitGuess, submitting, buildFullGuess, play]);

  useEffect(() => {
    if (status !== "active" || unrevealedCount === 0) return;
    if (localGuess.length === unrevealedCount && isCompleteCorrectGuess(localGuess)) {
      void trySubmit();
    }
  }, [localGuess, unrevealedCount, status, trySubmit, isCompleteCorrectGuess]);

  const handleLocalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" || !localGuess.trim() || !onSubmitGuess || submitting) return;
    e.preventDefault();
    void trySubmit();
  };

  const letterStyle = (i: number): React.CSSProperties => ({
    display: "inline-block",
    animation: `cl-letter-in 0.4s cubic-bezier(0.3, 1.5, 0.5, 1) both`,
    animationDelay: `${0.055 * i}s`,
  });

  const isLive = status === "active" && Boolean(onSubmitGuess);
  // The slot the next typed letter lands in, so the caret can sit there.
  const caretPosition = chars.findIndex(
    (_, pos) => pos > 0 && !revealedLetters[pos] && unrevealedSlotIndex(revealedLetters, pos) === localGuess.length,
  );

  const rowClass = [
    "cl-word-row",
    "cl-row",
    `is-${status}`,
    status === "active" && !onSubmitGuess ? "is-over" : "",
    wrongFlash ? "is-wrong" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const linkState =
    status !== "solved" ? "dim" : nextStatus === "solved" ? "joined" : nextStatus === "active" ? "next" : "dim";

  return (
    <div>
      {previousWord && isLive && (
        <div className="cl-ask">
          <b>{capitalize(previousWord)}</b> <span aria-hidden="true">____</span> ?
        </div>
      )}

      <div ref={rowRef} className={rowClass}>
        <div className="cl-word-letters" onClick={isLive ? () => inputRef.current?.focus() : undefined}>
          {status === "solved" ? (
            <span>
              {chars.map((ch, i) => (
                <span key={i} style={letterStyle(i)}>{displayChar(ch, i)}</span>
              ))}
            </span>
          ) : (
            <>
              {chars.map((ch, pos) => {
                if (pos === 0) {
                  return <span key={pos} className="cl-cell">{displayChar(ch, 0)}</span>;
                }
                if (revealedLetters[pos]) {
                  return <span key={pos} className="cl-cell is-hint">{ch.toLowerCase()}</span>;
                }
                const typed = isLive ? localGuess[unrevealedSlotIndex(revealedLetters, pos)] : undefined;
                const caret = isLive && pos === caretPosition ? " is-caret" : "";
                return (
                  <span key={pos} className={`cl-cell${typed ? "" : " is-blank"}${caret}`}>
                    {typed?.toLowerCase()}
                  </span>
                );
              })}

              {/* Invisible input captures keystrokes; letters render above */}
              {isLive && (
                <input
                  ref={inputRef}
                  className="cl-row-input"
                  type="text"
                  value={localGuess}
                  onChange={(e) => setLocalGuess(e.target.value.toLowerCase().slice(0, unrevealedCount))}
                  onKeyDown={handleLocalKeyDown}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  aria-label={`Guess remaining letters for ${word}`}
                />
              )}
            </>
          )}
        </div>

        {status === "solved" ? (
          index === 0 ? (
            <span className="cl-row-tag">Start</span>
          ) : (
            <span className="cl-row-tick" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 6.5l2.3 2.3 4.7-5.3" />
              </svg>
            </span>
          )
        ) : status === "active" && wrongFlash ? (
          <div className="cl-row-miss anim-pop-in">
            <span aria-hidden="true">&#10007;</span>
            Not quite
          </div>
        ) : (
          <span className="cl-row-n">{`${index + 1} / ${totalWords}`}</span>
        )}
      </div>

      {index < totalWords - 1 && (
        <ChainLink state={linkState} animated={status === "solved" && revealTrigger > 0} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Game                                                          */
/* ------------------------------------------------------------------ */

export default function ChainlinkGame({ mode = "daily" }: { mode?: GameMode }) {
  const store = useChainlinkStore();
  const { play } = useSound();
  const completeCelebratedRef = useRef(false);
  const savedAttemptRef = useRef(false);
  const {
    puzzleWords,
    loading,
    loadError,
    date,
    wordStatuses,
    wordAttempts,
    revealedLetters,
    hintsRemaining,
    gameStatus,
    puzzleId,
    feedback,
    justSolvedIndex,
    submitGuess,
    useHint: storeUseHint,
    clearFeedback,
    clearJustSolved,
    initPuzzle,
    resetGame,
  } = store;

  const [hintAnim, setHintAnim] = useState(false);
  const [showCompleteOverlay, setShowCompleteOverlay] = useState(false);
  const [showFailOverlay, setShowFailOverlay] = useState(false);
  // Starts false on the server and in the browser alike, so the first render matches the
  // server's HTML. The effect below switches it on once saved progress has loaded.
  const [storeReady, setStoreReady] = useState(false);
  const failCelebratedRef = useRef(false);
  const playedThisVisitRef = useRef(false);
  const savedFailRef = useRef(false);

  const isComplete = gameStatus === "completed";
  const isFailed = gameStatus === "failed";
  const isOver = isComplete || isFailed;

  // Initialize after persist rehydration so we don't clobber an in-progress daily.
  useEffect(() => {
    const start = () => {
      setStoreReady(true);
      void initPuzzle(mode);
    };

    if (useChainlinkStore.persist.hasHydrated()) {
      start();
      return;
    }

    const unsub = useChainlinkStore.persist.onFinishHydration(start);
    const fallback = window.setTimeout(() => {
      if (useChainlinkStore.persist.hasHydrated()) {
        start();
        return;
      }
      void Promise.resolve(useChainlinkStore.persist.rehydrate()).finally(start);
    }, 750);

    return () => {
      unsub?.();
      window.clearTimeout(fallback);
    };
  }, [mode, initPuzzle]);

  // A finished puzzle is restored on every visit. Only a finish that happens while the page
  // is open should be celebrated, so note when this visit has seen the puzzle still in play.
  useEffect(() => {
    if (storeReady && !loading && puzzleWords.length > 0 && gameStatus === "playing") {
      playedThisVisitRef.current = true;
    }
  }, [storeReady, loading, puzzleWords.length, gameStatus]);

  useEffect(() => {
    if (!isComplete || completeCelebratedRef.current) return;
    completeCelebratedRef.current = true;
    if (!playedThisVisitRef.current) return;
    play("win");
    void fireConfetti("gold");
  }, [isComplete, play]);

  useEffect(() => {
    if (!isComplete || savedAttemptRef.current) return;
    savedAttemptRef.current = true;
    if (mode === "daily") {
      recordDailyCompletion("chainlink");
    }
    fetch("/api/chain/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        puzzleId,
        mode,
        completed: true,
      }),
    }).catch(() => {});
  }, [isComplete, puzzleId, mode]);

  useEffect(() => {
    if (!isFailed || failCelebratedRef.current) return;
    failCelebratedRef.current = true;
    if (!playedThisVisitRef.current) return;
    play("wrong");
  }, [isFailed, play]);

  useEffect(() => {
    if (!isFailed || savedFailRef.current) return;
    savedFailRef.current = true;
    if (mode === "daily") {
      recordDailyCompletion("chainlink");
    }
    fetch("/api/chain/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        puzzleId,
        mode,
        completed: false,
      }),
    }).catch(() => {});
  }, [isFailed, puzzleId, mode]);

  useEffect(() => {
    if (!isComplete) {
      completeCelebratedRef.current = false;
      savedAttemptRef.current = false;
      setShowCompleteOverlay(false);
    }
    if (!isFailed) {
      failCelebratedRef.current = false;
      savedFailRef.current = false;
      setShowFailOverlay(false);
    }
    if (!isComplete && !isFailed) return;

    if (isComplete) {
      const timer = setTimeout(() => setShowCompleteOverlay(true), 1000);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => setShowFailOverlay(true), 600);
    return () => clearTimeout(timer);
  }, [isComplete, isFailed]);

  useEffect(() => {
    if (feedback) {
      const delay =
        feedback.type === "correct" ? 1500
        : feedback.type === "hint" ? 1800
        : 2000;
      const timer = setTimeout(() => clearFeedback(), delay);
      return () => clearTimeout(timer);
    }
  }, [feedback, clearFeedback]);

  useEffect(() => {
    if (justSolvedIndex !== null) {
      const timer = setTimeout(() => clearJustSolved(), 800);
      return () => clearTimeout(timer);
    }
  }, [justSolvedIndex, clearJustSolved]);

  useEffect(() => {
    if (feedback?.type === "hint") {
      play("hint");
      setHintAnim(true);
      const timer = setTimeout(() => setHintAnim(false), 600);
      return () => clearTimeout(timer);
    }
  }, [feedback, play]);

  const handleHint = useCallback(() => {
    play("ui.tap");
    const result = storeUseHint();
    if (result?.solved) {
      play("correct");
      setHintAnim(true);
      setTimeout(() => setHintAnim(false), 600);
    }
  }, [storeUseHint, play]);

  const isPuzzleLoading =
    !loadError && (!storeReady || loading || puzzleWords.length === 0);

  const totalTries = Math.max(MAX_TRIES, hintsRemaining);
  const summary = summarizeChain(puzzleWords, wordStatuses, wordAttempts, revealedLetters);
  const shareText = chainLinkShare(wordStatuses, wordAttempts, revealedLetters, shareDate());

  return (
    <>
      <TutorialModal />
      {loadError ? (
      <div className="cl-game cl-state">
        <p>{loadError}</p>
        <button type="button" className="cl-quiet-btn" onClick={() => void initPuzzle(mode)}>
          Try again
        </button>
      </div>
      ) : isPuzzleLoading ? (
      <div className="cl-game cl-state">Loading puzzle...</div>
      ) : (
      <div className="game-shell cl-game">
        {/* ---- Header ---- */}
        <header className="cl-head">
          <div className="cl-head-top">
            <Link href="/" className="cl-back">
              &larr; Back
            </Link>
            <GameTitle game="chainlink" as="h1" className="cl-title" />
            <span />
          </div>

          <div className="cl-date">{formatDate(date || getDateString())}</div>

          {/* Tries + hint */}
          {gameStatus === "playing" && (
            <div className={`cl-bar${hintAnim ? " is-pulsing" : ""}`}>
              <div className={`cl-tries${hintsRemaining <= 1 ? " is-low" : ""}`}>
                <span className="cl-pips" aria-hidden="true">
                  {Array.from({ length: totalTries }, (_, i) => (
                    <i key={i} className={i < hintsRemaining ? undefined : "is-off"} />
                  ))}
                </span>
                <span>
                  {hintsRemaining} {hintsRemaining === 1 ? "try" : "tries"} left
                </span>
              </div>
              <button type="button" className="cl-hint" onClick={handleHint} disabled={hintsRemaining <= 0}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 18h6" />
                  <path d="M10 22h4" />
                  <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
                </svg>
                Hint
              </button>
            </div>
          )}
        </header>

        {/* ---- Word chain + completion overlay ---- */}
        <div className="cl-chain-wrap">
          <div className="cl-chain">
            {puzzleWords.map((word, i) => (
              <WordRow
                key={`${word}-${i}`}
                word={word}
                index={i}
                status={wordStatuses[i]}
                nextStatus={wordStatuses[i + 1]}
                previousWord={i > 0 ? puzzleWords[i - 1] : undefined}
                revealedLetters={revealedLetters[i] ?? []}
                revealTrigger={justSolvedIndex === i ? 1 : 0}
                totalWords={puzzleWords.length}
                onSubmitGuess={wordStatuses[i] === "active" && gameStatus === "playing" ? submitGuess : undefined}
              />
            ))}
          </div>

          {mode === "daily" ? (
            <DailyCompleteOverlay
              open={showFailOverlay || showCompleteOverlay}
              onClose={() => {
                setShowFailOverlay(false);
                setShowCompleteOverlay(false);
              }}
              ariaLabel={isComplete ? "Chain complete" : "Game over"}
              style={OVERLAY_THEME}
            >
              <ChainResult won={isComplete} summary={summary}>
                <p className="cl-result-note">Come back tomorrow for a new puzzle.</p>
                <div className="cl-result-actions">
                  <WinStreakLine gameId="chainlink" accentColor="var(--cl-green)" />
                  <ShareResult gameId="chainlink" text={shareText} />
                  <OtherDailies currentGameId="chainlink" />
                </div>
              </ChainResult>
            </DailyCompleteOverlay>
          ) : (
            (showFailOverlay || showCompleteOverlay) && (
              <div className="cl-inline-overlay anim-fade-slide-up">
                <ChainResult won={isComplete} summary={summary}>
                  <Link href="/" className="cl-quiet-btn">
                    &larr; Back
                  </Link>
                </ChainResult>
              </div>
            )
          )}
        </div>

        {/* ---- Feedback ---- */}
        {feedback && (
          <div key={feedback.type + feedback.message} className={`cl-feedback anim-pop-in is-${feedback.type}`}>
            {feedback.message}
          </div>
        )}

        {!isOver && (
          <p className="cl-tip">
            Each word pairs with the one before it, like <b>apple juice</b>, then <b>juice box</b>.
          </p>
        )}
      </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Finish screen                                                      */
/* ------------------------------------------------------------------ */

function resultLead(won: boolean, summary: ChainSummary): string {
  if (!won) return `You got ${summary.solved} of ${summary.total}. Here is the full chain.`;
  const plural = (n: number, one: string, many: string) => (n === 0 ? `no ${many}` : `${n} ${n === 1 ? one : many}`);
  return `Solved with ${plural(summary.misses, "miss", "misses")} and ${plural(summary.hints, "hint", "hints")}.`;
}

function ChainResult({
  won,
  summary,
  children,
}: {
  won: boolean;
  summary: ChainSummary;
  children: React.ReactNode;
}) {
  return (
    <div className="cl-result">
      <div className={`cl-badge${won ? "" : " is-bad"}`} aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          {won ? <path d="M5 12.5l4.5 4.5L19 7" /> : <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />}
        </svg>
      </div>
      <h2>{won ? "Chain complete" : "Out of tries"}</h2>
      <p className="cl-result-lead">{resultLead(won, summary)}</p>

      <ol className="cl-mini">
        {summary.rows.map((row, i) => (
          <li key={i} className={`is-${row.outcome}`}>
            {capitalize(row.word)}
            {row.label && <em>{row.label}</em>}
          </li>
        ))}
      </ol>

      {children}
    </div>
  );
}
