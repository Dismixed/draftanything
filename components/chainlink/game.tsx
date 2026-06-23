"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useChainlinkStore } from "@/lib/chainlink/store";
import { getDateString } from "@/lib/chainlink/puzzles";
import type { GameMode } from "@/lib/chainlink/types";
import TutorialModal from "./tutorial-modal";

/* ------------------------------------------------------------------ */
/*  Keyframes (injected once)                                         */
/* ------------------------------------------------------------------ */

const REVEAL_KEYFRAMES = `
@keyframes cl-letter-in {
  0%   { opacity: 0; transform: translateY(8px) scale(0.8); }
  60%  { opacity: 1; transform: translateY(-2px) scale(1.04); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes cl-chain-grow {
  0%   { transform: scaleY(0); opacity: 0; }
  100% { transform: scaleY(1); opacity: 1; }
}
@keyframes cl-shake {
  0%, 100% { transform: translateX(0); }
  20%      { transform: translateX(-6px); }
  40%      { transform: translateX(6px); }
  60%      { transform: translateX(-4px); }
  80%      { transform: translateX(4px); }
}
@keyframes cl-hint-pulse {
  0%, 100% { box-shadow: 0 0 0 rgba(201,168,76,0); }
  50%      { box-shadow: 0 0 12px rgba(201,168,76,0.25); }
}
`;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function displayWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function displayChar(ch: string, i: number): string {
  return i === 0 ? ch.toUpperCase() : ch;
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
        height: "32px",
        opacity: active ? 1 : 0.15,
        transition: "opacity 0.5s ease",
        animation: animated ? "cl-chain-grow 0.4s ease forwards" : undefined,
        transformOrigin: "center top",
      }}
    >
      <svg width="20" height="24" viewBox="0 0 20 24" fill="none" style={{ display: "block" }}>
        <circle cx="10" cy="4" r="3.5" stroke={active ? "#c9a84c" : "#6a7090"} strokeWidth="1.5" fill={active ? "rgba(201,168,76,0.12)" : "none"} />
        <circle cx="10" cy="20" r="3.5" stroke={active ? "#c9a84c" : "#6a7090"} strokeWidth="1.5" fill={active ? "rgba(201,168,76,0.12)" : "none"} />
        <rect x="8.5" y="7" width="3" height="10" rx="1.5" fill={active ? "#c9a84c" : "#6a7090"} opacity={active ? 0.6 : 0.3} />
        <path d="M6 8 Q10 12 14 8" stroke={active ? "#c9a84c" : "#6a7090"} strokeWidth="1.2" fill="none" opacity={active ? 0.5 : 0.2} />
        <path d="M6 16 Q10 12 14 16" stroke={active ? "#c9a84c" : "#6a7090"} strokeWidth="1.2" fill="none" opacity={active ? 0.5 : 0.2} />
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
  wordAttempts,
  revealedLetters,
  revealTrigger,
  totalWords,
  onSubmitGuess,
}: {
  word: string;
  index: number;
  status: "locked" | "active" | "solved";
  wordAttempts: string[];
  revealedLetters: boolean[];
  revealTrigger: number;
  totalWords: number;
  onSubmitGuess?: (guess: string) => "correct" | "incorrect" | "already-solved";
}) {
  const chars = word.split("");
  const attemptsCount = wordAttempts.length;
  const hasHintReveals = revealedLetters.some(Boolean);
  const unrevealedCount = (word.length - 1) - revealedLetters.filter(Boolean).length;

  const [localGuess, setLocalGuess] = useState("");
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === "active") {
      inputRef.current?.focus();
    }
  }, [status]);

  // Clear local input when word changes
  useEffect(() => {
    setLocalGuess("");
    setShake(false);
  }, [word]);

  const handleLocalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && localGuess.trim() && onSubmitGuess) {
      // Build the full word: first letter + hint-revealed letters + typed remainder
      const typed = localGuess.trim();
      let typedIdx = 0;
      let fullGuess = word[0].toUpperCase();
      for (let i = 1; i < word.length; i++) {
        if (revealedLetters[i]) {
          fullGuess += word[i];
        } else {
          fullGuess += typed[typedIdx] ?? "";
          typedIdx++;
        }
      }
      const result = onSubmitGuess(fullGuess);
      if (result === "correct") {
        setLocalGuess("");
      } else if (result === "incorrect") {
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    }
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <div
        style={{
          fontSize: "9px",
          fontWeight: 600,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: status === "locked" ? "var(--text-dim)" : status === "active" ? "var(--gold)" : "var(--gold-hi)",
          opacity: status === "locked" ? 0.35 : 0.8,
          marginLeft: "2px",
        }}
      >
        {index + 1} of {totalWords}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "14px 18px",
          background:
            status === "active"
              ? "linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(124,58,255,0.04) 100%)"
              : status === "solved"
                ? "linear-gradient(135deg, rgba(201,168,76,0.12) 0%, rgba(201,168,76,0.04) 100%)"
                : "var(--panel)",
          border: `1px solid ${
            status === "active"
              ? "rgba(201,168,76,0.4)"
              : status === "solved"
                ? "rgba(201,168,76,0.25)"
                : "var(--border)"
          }`,
          boxShadow:
            status === "active"
              ? hasHintReveals
                ? "0 0 20px rgba(201,168,76,0.12), inset 0 0 30px rgba(201,168,76,0.05)"
                : "0 0 20px rgba(201,168,76,0.08), inset 0 0 30px rgba(201,168,76,0.03)"
              : status === "solved"
                ? "0 0 12px rgba(201,168,76,0.06)"
                : "none",
          transition: "border-color 0.3s ease, background 0.3s ease, box-shadow 0.3s ease",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {status === "active" && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "15%",
              right: "15%",
              height: "1px",
              background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)",
              pointerEvents: "none",
            }}
          />
        )}

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: "4px",
            minHeight: "1.4em",
          }}
        >
          {status === "solved" ? (
            <span
              style={{
                fontFamily: '"Playfair Display", serif',
                fontSize: "clamp(20px, 4vw, 28px)",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "var(--gold-hi)",
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
                animation: shake ? "cl-shake 0.4s ease" : undefined,
              }}
            >
              {/* First letter */}
              <span
                style={{
                  fontFamily: '"Playfair Display", serif',
                  fontSize: "clamp(20px, 4vw, 28px)",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "var(--gold)",
                  flexShrink: 0,
                }}
              >
                {word[0].toUpperCase()}
              </span>

              {/* Hint-revealed letters shown inline */}
              {chars.slice(1).map((ch, idx) => {
                const pos = idx + 1;
                if (revealedLetters[pos]) {
                  return (
                    <span
                      key={pos}
                      style={{
                        fontFamily: '"Playfair Display", serif',
                        fontSize: "clamp(20px, 4vw, 28px)",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        color: "var(--gold)",
                        opacity: 0.7,
                      }}
                    >
                      {ch}
                    </span>
                  );
                }
                return null;
              })}

              {/* Inline input for the remaining unrevealed part */}
              <input
                ref={inputRef}
                type="text"
                value={localGuess}
                onChange={(e) => setLocalGuess(e.target.value)}
                onKeyDown={handleLocalKeyDown}
                autoComplete="off"
                spellCheck={false}
                placeholder={"_ ".repeat(Math.max(0, unrevealedCount)).trim()}
                style={{
                  fontFamily: '"Playfair Display", serif',
                  fontSize: "clamp(20px, 4vw, 28px)",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "var(--text)",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  padding: 0,
                  margin: 0,
                  flex: 1,
                  minWidth: "60px",
                  caretColor: "var(--gold)",
                }}
              />
            </div>
          ) : (
            <span
              style={{
                fontFamily: '"Playfair Display", serif',
                fontSize: "clamp(20px, 4vw, 28px)",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "var(--text-dim)",
                opacity: status === "locked" ? 0.3 : 1,
              }}
            >
              {chars.map((ch, i) => {
                const show = i === 0 || revealedLetters[i];
                return (
                  <span
                    key={i}
                    style={{
                      opacity: show ? 1 : 0.35,
                      transition: "opacity 0.3s ease, color 0.3s ease",
                      color: show && i !== 0 ? "var(--gold)" : undefined,
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

        {status === "active" && attemptsCount > 0 && !onSubmitGuess && (
          <div
            style={{
              marginLeft: "auto",
              fontSize: "10px",
              color: "var(--text-dim)",
              opacity: 0.5,
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
  const {
    puzzle,
    date,
    currentWordIndex,
    wordStatuses,
    wordAttempts,
    revealedLetters,
    hintsRemaining,
    themeGuessed,
    themeAttempts,
    score,
    gameStatus,
    feedback,
    justSolvedIndex,
    submitGuess,
    submitThemeGuess,
    useHint: storeUseHint,
    clearFeedback,
    clearJustSolved,
    initPuzzle,
    resetGame,
  } = store;

  const [themeGuess, setThemeGuess] = useState("");
  const themeInputRef = useRef<HTMLInputElement>(null);
  const [hintAnim, setHintAnim] = useState(false);

  // Initialize
  useEffect(() => {
    initPuzzle(mode);
    if (typeof document !== "undefined" && !document.getElementById("cl-keyframes")) {
      const style = document.createElement("style");
      style.id = "cl-keyframes";
      style.textContent = REVEAL_KEYFRAMES;
      document.head.appendChild(style);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (feedback) {
      const delay = feedback.type === "correct" || feedback.type === "theme-correct" ? 1500 : 2000;
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

  const handleSubmitThemeGuess = useCallback(() => {
    if (!themeGuess.trim() || themeGuessed) return;
    submitThemeGuess(themeGuess.trim());
  }, [themeGuess, themeGuessed, submitThemeGuess]);

  const handleThemeKeyDown = useCallback(
    (e: React.KeyboardEvent) => { if (e.key === "Enter") handleSubmitThemeGuess(); },
    [handleSubmitThemeGuess],
  );

  const handleHint = useCallback(() => {
    const result = storeUseHint();
    if (result) {
      setHintAnim(true);
      setTimeout(() => setHintAnim(false), 600);
    }
  }, [storeUseHint]);

  if (!puzzle) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px", color: "var(--text-dim)" }}>
        Loading puzzle...
      </div>
    );
  }

  const allWordsSolved = wordStatuses.every((s) => s === "solved");
  const showThemeInput = allWordsSolved && !themeGuessed;
  const isUnlimited = mode === "unlimited";

  return (
    <>
      <TutorialModal />
      <div style={{ width: "100%", maxWidth: "520px", margin: "0 auto" }}>
        {/* ---- Header ---- */}
        <header style={{ textAlign: "center", marginBottom: "36px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "6px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="6" r="4" stroke="#c9a84c" strokeWidth="1.5" fill="rgba(201,168,76,0.15)" />
              <circle cx="12" cy="18" r="4" stroke="#c9a84c" strokeWidth="1.5" fill="rgba(201,168,76,0.15)" />
              <rect x="11" y="9" width="2" height="6" rx="1" fill="#c9a84c" opacity="0.5" />
            </svg>
            <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: "clamp(24px, 5vw, 32px)", fontWeight: 900, color: "var(--text)", margin: 0, letterSpacing: "-0.01em" }}>
              Chainlink
            </h1>
          </div>

          <div style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.28em", textTransform: "uppercase", color: "var(--text-dim)", opacity: 0.6, marginBottom: "4px" }}>
            {isUnlimited ? "Unlimited Mode" : `Daily Puzzle · ${formatDate(date || getDateString())}`}
          </div>

          {/* Score + Hints row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginTop: "8px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", padding: "6px 14px" }}>
              <span style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-dim)" }}>
                Score
              </span>
              <span style={{ fontFamily: '"Playfair Display", serif', fontSize: "18px", fontWeight: 700, color: "var(--gold-hi)" }}>
                {score}
              </span>
            </div>

            {gameStatus === "playing" && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(124,58,255,0.08)", border: "1px solid rgba(124,58,255,0.2)", padding: "6px 14px" }}>
                <span style={{ fontSize: "9px", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--text-dim)" }}>
                  Hints
                </span>
                <span style={{ fontFamily: '"Outfit", sans-serif', fontSize: "14px", fontWeight: 600, color: "var(--purple)" }}>
                  {hintsRemaining}
                </span>
              </div>
            )}
          </div>

          {puzzle && (
            <div style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--gold)", opacity: 0.7, marginTop: "10px" }}>
              {puzzle.theme}
            </div>
          )}
        </header>

          {/* Theme hint bar */}
        {!allWordsSolved && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "24px", padding: "10px 16px", background: "rgba(124,58,255,0.06)", border: "1px solid rgba(124,58,255,0.15)" }}>
            <span style={{ fontSize: "14px", color: "var(--purple)", opacity: 0.7 }}>&#9670;</span>
            <span style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "0.06em" }}>
              All 5 words belong to this category. Solve them all, then confirm the theme for bonus points.
            </span>
          </div>
        )}

        {/* ---- Word chain ---- */}
        <div style={{ display: "flex", flexDirection: "column", marginBottom: "16px" }}>
          {puzzle.words.map((word, i) => (
            <WordRow
              key={`${word}-${i}`}
              word={word}
              index={i}
              status={wordStatuses[i]}
              wordAttempts={wordAttempts[i]}
              revealedLetters={revealedLetters[i] ?? []}
              revealTrigger={justSolvedIndex === i ? 1 : 0}
              totalWords={puzzle.words.length}
              onSubmitGuess={wordStatuses[i] === "active" && gameStatus === "playing" ? submitGuess : undefined}
            />
          ))}
        </div>

        {/* ---- Hint button ---- */}
        {gameStatus === "playing" && !showThemeInput && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
            <button
              onClick={handleHint}
              disabled={hintsRemaining <= 0}
              className="btn-ghost"
              style={{
                width: "auto",
                padding: "8px 18px",
                fontSize: "10px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                animation: hintAnim ? "cl-hint-pulse 0.4s ease" : undefined,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18h6" />
                <path d="M10 22h4" />
                <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
              </svg>
              Hint ({hintsRemaining})
            </button>
          </div>
        )}

        {/* ---- Feedback ---- */}
        {feedback && (
          <div
            key={feedback.type + feedback.message}
            style={{
              textAlign: "center",
              padding: "10px 16px",
              marginBottom: "16px",
              fontSize: "12px",
              fontWeight: 500,
              color: feedback.type === "correct" || feedback.type === "theme-correct" ? "var(--gold-hi)" : "#ff6b6b",
              background: feedback.type === "correct" || feedback.type === "theme-correct" ? "rgba(201,168,76,0.08)" : "rgba(255,107,107,0.06)",
              border: `1px solid ${feedback.type === "correct" || feedback.type === "theme-correct" ? "rgba(201,168,76,0.2)" : "rgba(255,107,107,0.2)"}`,
              transition: "opacity 0.3s ease",
            }}
          >
            {feedback.message}
          </div>
        )}

        {/* ---- Theme guess ---- */}
        {showThemeInput && (
          <div style={{ marginTop: "8px", padding: "20px", border: "1px solid rgba(201,168,76,0.3)", background: "linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(124,58,255,0.04) 100%)", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: "12%", right: "12%", height: "1px", background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)", pointerEvents: "none" }} />
            <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--gold)", marginBottom: "4px" }}>
              &#9670; Bonus Round
            </div>
            <p style={{ fontSize: "13px", color: "var(--text)", margin: "0 0 12px", lineHeight: 1.5 }}>
              All 5 words share a common theme. What is it?
            </p>

            {themeAttempts.length > 0 && (
              <div style={{ marginBottom: "10px" }}>
                <div style={{ fontSize: "9px", color: "var(--text-dim)", opacity: 0.5, marginBottom: "4px" }}>Your guesses:</div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {themeAttempts.map((attempt, i) => (
                    <span key={i} style={{ fontSize: "10px", padding: "3px 8px", background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", color: "#ff6b6b" }}>
                      {attempt}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "8px" }}>
              <input
                ref={themeInputRef}
                type="text"
                value={themeGuess}
                onChange={(e) => setThemeGuess(e.target.value)}
                onKeyDown={handleThemeKeyDown}
                placeholder='e.g., "Animals", "Foods"...'
                autoComplete="off"
                spellCheck={false}
                className="da-input"
                style={{ flex: 1, fontSize: "14px", padding: "11px 14px" }}
              />
              <button
                onClick={handleSubmitThemeGuess}
                disabled={!themeGuess.trim()}
                className="btn-gold"
                style={{ width: "auto", padding: "11px 20px", fontSize: "10px", flexShrink: 0 }}
              >
                Guess
              </button>
            </div>
            <div style={{ fontSize: "9px", color: "var(--text-dim)", opacity: 0.4, marginTop: "6px" }}>
              +200 bonus points for the correct theme
            </div>
          </div>
        )}

        {/* ---- Completed ---- */}
        {themeGuessed && gameStatus === "completed" && (
          <div style={{ marginTop: "8px", padding: "28px 24px", textAlign: "center", border: "1px solid rgba(201,168,76,0.3)", background: "linear-gradient(135deg, rgba(201,168,76,0.1) 0%, rgba(124,58,255,0.06) 100%)", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: "10%", right: "10%", height: "1px", background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)", pointerEvents: "none" }} />
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>&#9670;</div>
            <h2 style={{ fontFamily: '"Playfair Display", serif', fontSize: "22px", fontWeight: 700, color: "var(--gold-hi)", margin: "0 0 6px", textShadow: "0 0 30px rgba(240,200,96,0.15)" }}>
              Chain Complete!
            </h2>
            <p style={{ fontSize: "12px", color: "var(--text-dim)", margin: "0 0 6px", lineHeight: 1.5 }}>
              Theme: <strong style={{ color: "var(--gold)" }}>{puzzle.theme}</strong>
            </p>
            <p style={{ fontSize: "13px", color: "var(--text)", margin: "0 0 20px" }}>
              Final score:{" "}
              <strong style={{ fontFamily: '"Playfair Display", serif', fontSize: "28px", fontWeight: 700, color: "var(--gold-hi)" }}>
                {score}
              </strong>
            </p>

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "center", marginBottom: "20px" }}>
              {puzzle.words.map((w, i) => (
                <span key={i} style={{ fontFamily: '"Playfair Display", serif', fontSize: "12px", padding: "6px 12px", background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", color: "var(--gold-hi)" }}>
                  {displayWord(w)}
                </span>
              ))}
            </div>

            <div style={{ fontSize: "10px", color: "var(--text-dim)", opacity: 0.5, marginBottom: "16px" }}>
              {isUnlimited ? "Play another round!" : "Come back tomorrow for a new puzzle!"}
            </div>

            <button onClick={resetGame} className="btn-gold" style={{ maxWidth: "220px", margin: "0 auto" }}>
              {isUnlimited ? "New Puzzle" : "Start Fresh"}
            </button>
          </div>
        )}

        {/* ---- Unlimited: New Game button (during play) ---- */}
        {isUnlimited && gameStatus === "playing" && (
          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <button onClick={resetGame} className="btn-ghost" style={{ maxWidth: "180px", margin: "0 auto", fontSize: "9px" }}>
              New Puzzle
            </button>
          </div>
        )}
      </div>
    </>
  );
}
