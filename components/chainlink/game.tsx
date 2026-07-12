"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useChainlinkStore } from "@/lib/chainlink/store";
import { formatPair, getDateString } from "@/lib/chainlink/puzzles";
import type { GameMode } from "@/lib/chainlink/types";
import { useSound } from "@/lib/audio/sound-context";
import { fireConfetti } from "@/lib/motion/confetti";
import { triggerAnimation } from "@/lib/motion/trigger-class";
import { SoundToggle } from "@/components/ui/sound-toggle";
import { GameTitle } from "@/components/ui/game-title";
import TutorialModal from "./tutorial-modal";
import { OtherDailies } from "@/components/daily/other-dailies";
import { WinStreakLine } from "@/components/streak/streak-notifier";
import { recordDailyCompletion } from "@/lib/streak/storage";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

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

function ChainLink({ active, animated }: { active: boolean; animated: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "28px",
        opacity: active ? 1 : 0.15,
        transition: "opacity 0.5s ease",
        animation: animated ? "cl-chain-grow 0.4s ease forwards" : undefined,
        transformOrigin: "center top",
      }}
    >
      <svg width="14" height="18" viewBox="0 0 12 16" fill="none" style={{ display: "block" }}>
        <circle cx="6" cy="3" r="2.5" stroke={active ? "#565758" : "#3a3a3c"} strokeWidth="1.5" fill="none" />
        <circle cx="6" cy="13" r="2.5" stroke={active ? "#565758" : "#3a3a3c"} strokeWidth="1.5" fill="none" />
        <line x1="6" y1="5.5" x2="6" y2="10.5" stroke={active ? "#565758" : "#3a3a3c"} strokeWidth="1.5" />
      </svg>
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
  previousWord,
  wordAttempts,
  revealedLetters,
  revealTrigger,
  totalWords,
  onSubmitGuess,
}: {
  word: string;
  index: number;
  status: "locked" | "active" | "solved";
  previousWord?: string;
  wordAttempts: string[];
  revealedLetters: boolean[];
  revealTrigger: number;
  totalWords: number;
  onSubmitGuess?: (guess: string) => "correct" | "incorrect" | "already-solved" | Promise<"correct" | "incorrect" | "already-solved">;
}) {
  const chars = word.split("");
  const attemptsCount = wordAttempts.length;
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

  const letterStyle = (i: number): React.CSSProperties => {
    if (status === "solved") {
      return {
        display: "inline-block",
        animation: `cl-letter-in 0.35s ease both`,
        animationDelay: `${0.05 * i}s`,
      };
    }
    return {};
  };

  const linkHint =
    previousWord && status === "active"
      ? formatPair(previousWord, "?")
      : previousWord && status === "solved" && index > 0
        ? formatPair(previousWord, word)
        : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {linkHint && (
        <div
          style={{
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.04em",
            color: status === "active" ? "#c9b458" : "#787c7e",
            opacity: status === "active" ? 0.85 : 0.55,
            marginLeft: "2px",
            marginBottom: "2px",
          }}
        >
          {linkHint}
        </div>
      )}

      <div
        style={{
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: status === "locked" ? "#3a3a3c" : status === "active" ? "#c9b458" : "#6aaa64",
          opacity: status === "locked" ? 1 : 0.9,
          marginLeft: "2px",
        }}
      >
        {index === 0 ? "Starting word" : `${index + 1} of ${totalWords}`}
      </div>

      <div
        ref={rowRef}
        className="cl-word-row"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "14px 18px",
          background:
            wrongFlash
              ? "rgba(255, 107, 107, 0.1)"
              : status === "active"
                ? "#1a1a1b"
                : status === "solved"
                  ? "#6aaa64"
                  : "#3a3a3c",
          border: `2px solid ${
            wrongFlash
              ? "#ff6b6b"
              : status === "active"
                ? "#c9b458"
                : status === "solved"
                  ? "#6aaa64"
                  : "#3a3a3c"
          }`,
          borderRadius: "6px",
          transition: "border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease",
          boxShadow: wrongFlash ? "0 0 0 1px rgba(255, 107, 107, 0.35), 0 0 20px rgba(255, 107, 107, 0.15)" : "none",
          position: "relative",
        }}
      >
        <div
          className="cl-word-letters"
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: "4px",
            minHeight: "1.4em",
            minWidth: 0,
          }}
        >
          {status === "solved" ? (
            <span
              style={{
                fontSize: "clamp(20px, 4vw, 28px)",
                fontWeight: 700,
                letterSpacing: "0.06em",
                color: "#ffffff",
              }}
            >
              {chars.map((ch, i) => (
                <span key={i} style={letterStyle(i)}>{displayChar(ch, i)}</span>
              ))}
            </span>
          ) : status === "active" && onSubmitGuess ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "2px",
                width: "100%",
                position: "relative",
                cursor: "text",
              }}
              onClick={() => inputRef.current?.focus()}
            >
              {/* First letter */}
              <span
                style={{
                  fontSize: "clamp(20px, 4vw, 28px)",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  color: "#ffffff",
                  flexShrink: 0,
                }}
              >
                {displayChar(word[0], 0)}
              </span>

              {/* Remaining letters — hints, typed chars, or underscores */}
              {chars.slice(1).map((ch, idx) => {
                const pos = idx + 1;
                if (revealedLetters[pos]) {
                  return (
                    <span
                      key={pos}
                      style={{
                        fontSize: "clamp(20px, 4vw, 28px)",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        color: "#c9b458",
                      }}
                    >
                      {ch.toLowerCase()}
                    </span>
                  );
                }
                const slot = unrevealedSlotIndex(revealedLetters, pos);
                const typed = localGuess[slot];
                return (
                  <span
                    key={pos}
                    style={{
                      fontSize: "clamp(20px, 4vw, 28px)",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      color: typed ? "#ffffff" : "#565758",
                      opacity: typed ? 1 : 0.5,
                    }}
                  >
                    {typed?.toLowerCase() ?? "_"}
                  </span>
                );
              })}

              {/* Hidden input captures keystrokes; letters render above */}
              <input
                ref={inputRef}
                type="text"
                value={localGuess}
                onChange={(e) => setLocalGuess(e.target.value.toLowerCase().slice(0, unrevealedCount))}
                onKeyDown={handleLocalKeyDown}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-label={`Guess remaining letters for ${word}`}
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0,
                  cursor: "text",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  padding: 0,
                  margin: 0,
                  caretColor: "transparent",
                }}
              />
            </div>
          ) : (
            <span
              style={{
                fontSize: "clamp(20px, 4vw, 28px)",
                fontWeight: 700,
                letterSpacing: "0.06em",
                color: "#565758",
              }}
            >
              {chars.map((ch, i) => {
                const show = i === 0 || revealedLetters[i];
                return (
                  <span
                    key={i}
                    style={{
                      opacity: show ? 1 : 0.5,
                      transition: "opacity 0.3s ease, color 0.3s ease",
                      color: show && i !== 0 ? "#c9b458" : undefined,
                    }}
                  >
                    {show ? displayChar(ch, i) : "_"}
                    {i < word.length - 1 && " "}
                  </span>
                );
              })}
            </span>
          )}
        </div>

        {status === "active" && wrongFlash && (
          <div
            className="anim-pop-in"
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "#ff6b6b",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <span aria-hidden="true">&#10007;</span>
            Not quite
          </div>
        )}

        {status === "active" && attemptsCount > 0 && !onSubmitGuess && !wrongFlash && (
          <div
            style={{
              marginLeft: "auto",
              fontSize: "10px",
              color: "#787c7e",
              opacity: 0.7,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {attemptsCount} {attemptsCount === 1 ? "try" : "tries"}
          </div>
        )}
      </div>

      {index < totalWords - 1 && (
        <ChainLink active={status === "solved"} animated={status === "solved" && revealTrigger > 0} />
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
  const [storeReady, setStoreReady] = useState(
    () => typeof window !== "undefined" && useChainlinkStore.persist.hasHydrated(),
  );
  const failCelebratedRef = useRef(false);
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

  useEffect(() => {
    if (!isComplete || completeCelebratedRef.current) return;
    completeCelebratedRef.current = true;
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
    storeReady && !loadError && (loading || puzzleWords.length === 0);

  return (
    <>
      <TutorialModal />
      {loadError ? (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "300px",
          gap: "16px",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, color: "#787c7e", fontSize: "14px", lineHeight: 1.5, maxWidth: "320px" }}>
          {loadError}
        </p>
        <button
          type="button"
          onClick={() => void initPuzzle(mode)}
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            border: "1px solid #3a3a3c",
            background: "#1a1a1b",
            color: "#d7dadc",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          Try again
        </button>
      </div>
      ) : isPuzzleLoading ? (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px", color: "#787c7e" }}>
        Loading puzzle...
      </div>
      ) : (
      <div className="game-shell" style={{ width: "100%", maxWidth: "520px", margin: "0 auto" }}>
        {/* ---- Header ---- */}
        <header style={{ textAlign: "center", marginBottom: "32px", position: "relative" }}>
          <div style={{ position: "absolute", top: 0, left: 0 }}>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                fontWeight: 500,
                color: "#787c7e",
                textDecoration: "none",
                padding: "4px 0",
              }}
            >
              &larr; Back
            </Link>
          </div>
          <div style={{ position: "absolute", top: 0, right: 0 }}>
            <SoundToggle />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "6px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="6" r="4" stroke="#ffffff" strokeWidth="2" fill="none" />
              <circle cx="12" cy="18" r="4" stroke="#ffffff" strokeWidth="2" fill="none" />
              <rect x="11" y="9" width="2" height="6" rx="1" fill="#ffffff" />
            </svg>
            <GameTitle
              game="chainlink"
              as="h1"
              style={{
                fontSize: "clamp(24px, 5vw, 32px)",
                fontWeight: 700,
                color: "#ffffff",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            />
          </div>

          <div style={{ fontSize: "11px", fontWeight: 500, color: "#565758", marginBottom: "4px" }}>
            {`Daily Puzzle · ${formatDate(date || getDateString())}`}
          </div>

          {/* Tries + hint */}
          {gameStatus === "playing" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                marginTop: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: hintsRemaining <= 1 ? "#ff6b6b" : "#787c7e",
                  letterSpacing: "0.04em",
                  animation: hintAnim ? "cl-hint-pulse 0.4s ease" : undefined,
                }}
              >
                {hintsRemaining} {hintsRemaining === 1 ? "try" : "tries"} left
              </span>
              <button
                onClick={handleHint}
                disabled={hintsRemaining <= 0}
                style={{
                  width: "auto",
                  padding: "10px 20px",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#565758",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: hintsRemaining > 0 ? "pointer" : "not-allowed",
                  opacity: hintsRemaining > 0 ? 1 : 0.4,
                  animation: hintAnim ? "cl-hint-pulse 0.4s ease" : undefined,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18h6" />
                  <path d="M10 22h4" />
                  <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
                </svg>
                Hint
              </button>
            </div>
          )}

        </header>

        {!isOver && (
          <div className="cl-hint-banner" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "24px", padding: "10px 16px", background: "rgba(106,170,100,0.08)", border: "1px solid rgba(106,170,100,0.2)", borderRadius: "6px" }}>
            <span style={{ fontSize: "14px", color: "#6aaa64", opacity: 0.7 }}>&#9670;</span>
            <span style={{ fontSize: "11px", color: "#787c7e", letterSpacing: "0.04em" }}>
              Each word pairs with the one before it — like <em style={{ color: "#ffffff", fontStyle: "normal" }}>apple juice</em>, then <em style={{ color: "#ffffff", fontStyle: "normal" }}>juice box</em>.
            </span>
          </div>
        )}

        {/* ---- Word chain + completion overlay ---- */}
        <div style={{ position: "relative", marginBottom: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {puzzleWords.map((word, i) => (
              <WordRow
                key={`${word}-${i}`}
                word={word}
                index={i}
                status={wordStatuses[i]}
                previousWord={i > 0 ? puzzleWords[i - 1] : undefined}
                wordAttempts={wordAttempts[i]}
                revealedLetters={revealedLetters[i] ?? []}
                revealTrigger={justSolvedIndex === i ? 1 : 0}
                totalWords={puzzleWords.length}
                onSubmitGuess={wordStatuses[i] === "active" && gameStatus === "playing" ? submitGuess : undefined}
              />
            ))}
          </div>

          {showFailOverlay && (
            <div
              className="anim-fade-slide-up"
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px",
                background: "rgba(18, 18, 19, 0.92)",
                borderRadius: "6px",
              }}
            >
              <div
                style={{
                  width: "100%",
                  padding: "28px 24px",
                  textAlign: "center",
                  border: "2px solid #ff6b6b",
                  background: "#1a1a1b",
                  borderRadius: "6px",
                }}
              >
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>&#10007;</div>
                <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#ff6b6b", margin: "0 0 8px" }}>
                  Game Over
                </h2>
                <p style={{ fontSize: "12px", color: "#787c7e", margin: "0 0 20px" }}>
                  Wrong a fourth time and you&apos;re out. The full chain was:
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center", marginBottom: "20px" }}>
                  {puzzleWords.slice(1).map((w, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: "13px",
                        padding: "6px 14px",
                        background: "#3a3a3c",
                        borderRadius: "6px",
                        color: "#ff6b6b",
                        fontWeight: 600,
                      }}
                    >
                      {formatPair(puzzleWords[i], w)}
                    </span>
                  ))}
                </div>

                <div style={{ fontSize: "11px", color: "#787c7e", marginBottom: "16px" }}>
                  Come back tomorrow for a new puzzle!
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "28px",
                    marginTop: "8px",
                  }}
                >
                  {mode === "daily" && (
                    <OtherDailies currentGameId="chainlink" />
                  )}

                  <Link
                    href="/"
                    style={{
                      display: "inline-block",
                      textDecoration: "none",
                      background: "#565758",
                      color: "#ffffff",
                      padding: "10px 24px",
                      fontSize: "12px",
                      fontWeight: 600,
                      borderRadius: "6px",
                      letterSpacing: "0.04em",
                    }}
                  >
                    &larr; Back
                  </Link>
                </div>
              </div>
            </div>
          )}

          {showCompleteOverlay && (
            <div
              className="anim-fade-slide-up"
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px",
                background: "rgba(18, 18, 19, 0.92)",
                borderRadius: "6px",
              }}
            >
              <div
                style={{
                  width: "100%",
                  padding: "28px 24px",
                  textAlign: "center",
                  border: "2px solid #6aaa64",
                  background: "#1a1a1b",
                  borderRadius: "6px",
                }}
              >
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>&#9670;</div>
                <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#6aaa64", margin: "0 0 20px" }}>
                  Chain Complete!
                </h2>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center", marginBottom: "20px" }}>
                  {puzzleWords.slice(1).map((w, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: "13px",
                        padding: "6px 14px",
                        background: "#3a3a3c",
                        borderRadius: "6px",
                        color: "#6aaa64",
                        fontWeight: 600,
                      }}
                    >
                      {formatPair(puzzleWords[i], w)}
                    </span>
                  ))}
                </div>

                <div style={{ fontSize: "11px", color: "#787c7e", marginBottom: "4px" }}>
                  Come back tomorrow for a new puzzle!
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "28px",
                    marginTop: "16px",
                  }}
                >
                  {mode === "daily" && (
                    <WinStreakLine gameId="chainlink" accentColor="#6aaa64" />
                  )}

                  {mode === "daily" && (
                    <OtherDailies currentGameId="chainlink" />
                  )}

                  <Link
                    href="/"
                    style={{
                      display: "inline-block",
                      textDecoration: "none",
                      background: "#565758",
                      color: "#ffffff",
                      padding: "10px 24px",
                      fontSize: "12px",
                      fontWeight: 600,
                      borderRadius: "6px",
                      letterSpacing: "0.04em",
                    }}
                  >
                    &larr; Back
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ---- Feedback ---- */}
        {feedback && (
          <div
            key={feedback.type + feedback.message}
            className="anim-pop-in"
            style={{
              textAlign: "center",
              padding: "10px 16px",
              marginBottom: "16px",
              fontSize: "13px",
              fontWeight: 600,
              color:
                feedback.type === "correct" ? "#6aaa64"
                : feedback.type === "hint" ? "#c9b458"
                : "#ff6b6b",
              background:
                feedback.type === "correct" ? "rgba(106,170,100,0.1)"
                : feedback.type === "hint" ? "rgba(201,180,88,0.1)"
                : "rgba(255,107,107,0.08)",
              border: `1px solid ${
                feedback.type === "correct" ? "rgba(106,170,100,0.25)"
                : feedback.type === "hint" ? "rgba(201,180,88,0.25)"
                : "rgba(255,107,107,0.2)"
              }`,
              borderRadius: "6px",
              transition: "opacity 0.3s ease",
            }}
          >
            {feedback.message}
          </div>
        )}

      </div>
      )}
    </>
  );
}
