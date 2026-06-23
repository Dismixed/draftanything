"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { CategoryId, GameMode, Question } from "@/lib/brain-dead/types";
import {
  TIMER_MAX,
  LETTERS,
  DIFF_LABELS,
  getDailyQuestions,
  getProgressiveQuestions,
  calcScore,
  getResultCopy,
  getCountdownText,
} from "@/lib/brain-dead/game-logic";
import {
  getDailyPlayed,
  saveDailyPlayed,
  saveLeaderboardEntry,
} from "@/lib/brain-dead/storage";
import { useSound } from "@/lib/audio/sound-context";
import { fireConfetti } from "@/lib/motion/confetti";
import { triggerAnimation } from "@/lib/motion/trigger-class";
import { SoundToggle } from "@/components/ui/sound-toggle";

const ACCENT = "#ff3c3c";

type Screen = "played" | "game" | "result";

interface BrainDeadGameProps {
  mode: GameMode;
  category?: CategoryId;
  categoryName?: string;
}

export default function BrainDeadGame({
  mode,
  category = "random",
  categoryName = "Daily Mix",
}: BrainDeadGameProps) {
  const [screen, setScreen] = useState<Screen>("game");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qi, setQi] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [score, setScore] = useState(0);
  const [times, setTimes] = useState<number[]>([]);
  const [answered, setAnswered] = useState<"idle" | "correct" | "wrong" | "timeout">("idle");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [timerPct, setTimerPct] = useState(100);
  const [timerSecs, setTimerSecs] = useState(TIMER_MAX);
  const [timerColor, setTimerColor] = useState("#22c55e");
  const [nameInput, setNameInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [todayScore, setTodayScore] = useState(0);
  const [scoreFloat, setScoreFloat] = useState<number | null>(null);
  const [streakPulse, setStreakPulse] = useState(false);
  const [questionAnim, setQuestionAnim] = useState<"in" | "out" | null>(null);

  const { play } = useSound();
  const questionCardRef = useRef<HTMLDivElement>(null);
  const lastTickSecondRef = useRef<number | null>(null);
  const timeoutSoundPlayedRef = useRef(false);
  const resultCelebratedRef = useRef(false);

  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDaily = mode === "daily";
  const q = questions[qi];

  const clearIntervalTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const clearAdvance = useCallback(() => {
    if (advanceRef.current) clearTimeout(advanceRef.current);
    advanceRef.current = null;
  }, []);

  const clearTimers = useCallback(() => {
    clearIntervalTimer();
    clearAdvance();
  }, [clearIntervalTimer, clearAdvance]);

  const endGame = useCallback(() => {
    clearTimers();
    setScreen("result");
    if (isDaily) {
      saveDailyPlayed(score, correct);
    }
  }, [clearTimers, isDaily, score, correct]);

  const startTimer = useCallback(() => {
    clearIntervalTimer();
    let elapsed = 0;
    startTimeRef.current = Date.now();
    setTimerPct(100);
    setTimerColor("#22c55e");
    setTimerSecs(TIMER_MAX);
    lastTickSecondRef.current = null;
    timeoutSoundPlayedRef.current = false;

    timerRef.current = setInterval(() => {
      elapsed += 0.1;
      const remaining = Math.max(0, TIMER_MAX - elapsed);
      const pct = (remaining / TIMER_MAX) * 100;
      setTimerPct(pct);
      if (pct < 25) setTimerColor("#ef4444");
      else if (pct < 50) setTimerColor("#f59e0b");
      else setTimerColor("#22c55e");
      const secs = Math.ceil(remaining);
      setTimerSecs(secs);
      if (secs <= 3 && secs > 0 && lastTickSecondRef.current !== secs) {
        lastTickSecondRef.current = secs;
        play("ui.tick");
      }
      if (remaining <= 0) {
        clearIntervalTimer();
        if (!timeoutSoundPlayedRef.current) {
          timeoutSoundPlayedRef.current = true;
          play("wrong", { volumeScale: 0.6 });
          triggerAnimation(questionCardRef.current, "anim-flash-red", 450);
        }
        setAnswered("timeout");
        advanceRef.current = setTimeout(endGame, 1200);
      }
    }, 100);
  }, [clearIntervalTimer, endGame, play]);

  const beginGame = useCallback(
    (qs: Question[]) => {
      clearTimers();
      setQuestions(qs);
      setQi(0);
      setCorrect(0);
      setScore(0);
      setTimes([]);
      setAnswered("idle");
      setSelectedIdx(null);
      setScreen("game");
      setSubmitted(false);
      setSubmitError(false);
      setSubmitting(false);
      setNameInput("");
    },
    [clearTimers],
  );

  useEffect(() => {
    if (isDaily) {
      const played = getDailyPlayed();
      if (played) {
        setTodayScore(played.score);
        setCountdown(getCountdownText());
        setScreen("played");
        const iv = setInterval(() => setCountdown(getCountdownText()), 1000);
        return () => clearInterval(iv);
      }
      beginGame(getDailyQuestions());
    } else {
      beginGame(getProgressiveQuestions(category));
    }
    return clearTimers;
  }, [isDaily, category, beginGame, clearTimers]);

  useEffect(() => {
    if (screen === "game" && q && answered === "idle") {
      startTimer();
    }
    return clearIntervalTimer;
  }, [screen, qi, q, answered, startTimer, clearIntervalTimer]);

  const handleAnswer = (idx: number) => {
    if (!q || answered !== "idle") return;
    play("ui.tap");
    clearIntervalTimer();
    const timeTaken = (Date.now() - startTimeRef.current) / 1000;
    setTimes((prev) => [...prev, timeTaken]);

    setSelectedIdx(idx);
    if (idx === q.c) {
      const points = calcScore(q.d, timeTaken);
      play("correct");
      triggerAnimation(questionCardRef.current, "anim-flash-green", 450);
      setScoreFloat(points);
      setTimeout(() => setScoreFloat(null), 700);
      setAnswered("correct");
      setCorrect((c) => {
        const next = c + 1;
        if (next === 3 || next === 5 || next === 8) {
          play("streak");
          setStreakPulse(true);
          setTimeout(() => setStreakPulse(false), 500);
        }
        return next;
      });
      setScore((s) => s + points);
      advanceRef.current = setTimeout(() => {
        play("ui.whoosh");
        setQuestionAnim("out");
        setTimeout(() => {
          setAnswered("idle");
          setSelectedIdx(null);
          setQi((i) => i + 1);
          setQuestionAnim("in");
          setTimeout(() => setQuestionAnim(null), 320);
        }, 280);
      }, 650);
    } else {
      play("wrong");
      triggerAnimation(questionCardRef.current, "anim-flash-red", 450);
      setAnswered("wrong");
      advanceRef.current = setTimeout(endGame, 1200);
    }
  };

  useEffect(() => {
    if (screen !== "result" || resultCelebratedRef.current) return;
    if (questions.length > 0 && correct === questions.length) {
      resultCelebratedRef.current = true;
      play("win");
      void fireConfetti("brain-dead");
    }
  }, [screen, correct, questions.length, play]);

  useEffect(() => {
    if (screen === "game" && questions.length > 0 && qi >= questions.length) {
      endGame();
    }
  }, [screen, qi, questions.length, endGame]);

  const handleSubmitScore = async () => {
    const name = nameInput.trim() || "Anonymous";
    setSubmitting(true);
    setSubmitError(false);
    const result = await saveLeaderboardEntry(name, score, correct);
    setSubmitting(false);
    if (result.ok) {
      setSubmitted(true);
    } else {
      setSubmitError(true);
    }
  };

  const avgSpeed =
    times.length > 0
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : 0;
  const result = getResultCopy(correct);

  /* ── Already played ── */
  if (screen === "played") {
    return (
      <div style={{ textAlign: "center", padding: "24px 0" }}>
        <div
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border-hi)",
            borderRadius: "14px",
            padding: "40px 32px",
            maxWidth: "380px",
            margin: "0 auto",
          }}
        >
          <div style={{ fontSize: "2.2rem", marginBottom: "12px" }}>🔒</div>
          <h2
            style={{
              fontFamily: '"Playfair Display", serif',
              fontSize: "1.6rem",
              margin: "0 0 16px",
              color: "var(--text)",
            }}
          >
            Come back tomorrow.
          </h2>
          <div
            style={{
              fontSize: "3.5rem",
              fontWeight: 900,
              color: ACCENT,
              lineHeight: 1,
            }}
          >
            {todayScore}
          </div>
          <div style={{ color: "var(--text-dim)", fontSize: "0.85rem", marginTop: "4px" }}>
            your score today
          </div>
          <div
            style={{
              width: "40px",
              height: "2px",
              background: ACCENT,
              margin: "16px auto",
            }}
          />
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--text-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Next challenge
          </div>
          <div
            style={{
              fontSize: "1.6rem",
              fontWeight: 700,
              marginTop: "4px",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {countdown}
          </div>
          <div style={{ marginTop: "32px" }}>
            <Link
              href="/brain-dead/freeplay"
              className="btn-ghost"
              style={{ display: "block", textDecoration: "none" }}
            >
              Play Free Mode
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Result ── */
  if (screen === "result") {
    return (
      <div className="anim-fade-slide-up" style={{ textAlign: "center", padding: "24px 0" }}>
        <div style={{ fontSize: "3.5rem", marginBottom: "12px" }}>{result.icon}</div>
        <h2
          style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: "clamp(2rem, 5vw, 3rem)",
            margin: "0 0 8px",
            lineHeight: 1.1,
            color: "var(--text)",
          }}
        >
          {result.title.includes(" ") ? (
            <>
              {result.title.slice(0, result.title.lastIndexOf(" "))}{" "}
              <em style={{ fontStyle: "italic", color: ACCENT }}>
                {result.title.slice(result.title.lastIndexOf(" ") + 1)}
              </em>
            </>
          ) : (
            <em style={{ fontStyle: "italic", color: ACCENT }}>{result.title}</em>
          )}
        </h2>
        <p
          style={{
            color: "var(--text-dim)",
            fontSize: "0.95rem",
            maxWidth: "380px",
            margin: "0 auto 32px",
            lineHeight: 1.6,
          }}
        >
          {result.sub}
        </p>

        <div
          style={{
            display: "flex",
            gap: "40px",
            justifyContent: "center",
            flexWrap: "wrap",
            marginBottom: "32px",
          }}
        >
          {[
            { val: correct, lbl: "Correct" },
            { val: score, lbl: "Score" },
            { val: `${avgSpeed}s`, lbl: "Avg Speed" },
          ].map(({ val, lbl }) => (
            <div key={lbl} style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "2.5rem",
                  fontWeight: 900,
                  color: ACCENT,
                  lineHeight: 1,
                }}
              >
                {val}
              </div>
              <div
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-dim)",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  marginTop: "4px",
                }}
              >
                {lbl}
              </div>
            </div>
          ))}
        </div>

        {isDaily && !submitted && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <p style={{ color: "var(--text-dim)", fontSize: "0.88rem", margin: 0 }}>
              Add your name to the daily leaderboard
            </p>
            <input
              className="da-input"
              placeholder="Your name"
              maxLength={20}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              style={{ maxWidth: "300px", textAlign: "center" }}
            />
            <button
              type="button"
              onClick={handleSubmitScore}
              disabled={submitting}
              style={{
                background: ACCENT,
                color: "#fff",
                border: "none",
                padding: "12px 28px",
                fontFamily: "inherit",
                fontSize: "0.95rem",
                fontWeight: 700,
                borderRadius: "8px",
                cursor: submitting ? "default" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Submitting..." : "Submit Score"}
            </button>
            {submitError && (
              <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: 0 }}>
                Could not save score. Try again.
              </p>
            )}
          </div>
        )}

        {submitted && (
          <Link
            href="/brain-dead/leaderboard"
            style={{
              display: "inline-block",
              background: ACCENT,
              color: "#fff",
              border: "none",
              padding: "12px 28px",
              fontSize: "0.95rem",
              fontWeight: 700,
              borderRadius: "8px",
              textDecoration: "none",
              marginBottom: "16px",
            }}
          >
            View Leaderboard →
          </Link>
        )}

        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
            marginTop: "16px",
          }}
        >
          {!isDaily && (
            <>
              <button
                type="button"
                onClick={() => beginGame(getProgressiveQuestions(category))}
                style={{
                  background: ACCENT,
                  color: "#fff",
                  border: "none",
                  padding: "12px 24px",
                  fontFamily: "inherit",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                Play Again
              </button>
              <Link
                href="/brain-dead/freeplay"
                className="btn-ghost"
                style={{ textDecoration: "none", width: "auto", padding: "12px 24px" }}
              >
                Change Category
              </Link>
            </>
          )}
          <Link
            href="/brain-dead"
            className="btn-ghost"
            style={{ textDecoration: "none", width: "auto", padding: "12px 24px" }}
          >
            Home
          </Link>
        </div>
      </div>
    );
  }

  /* ── Game ── */
  if (!q) return null;

  const diffClass =
    q.d === 1
      ? { border: "#22c55e", color: "#22c55e", bg: "rgba(34,197,94,0.08)" }
      : q.d === 2
        ? { border: "#f59e0b", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" }
        : q.d === 3
          ? { border: "#ef4444", color: "#ef4444", bg: "rgba(239,68,68,0.1)" }
          : { border: "#a855f7", color: "#a855f7", bg: "rgba(168,85,247,0.1)" };

  return (
    <div className="game-shell" style={{ width: "100%", maxWidth: "700px", margin: "0 auto", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, right: 0, zIndex: 2 }}>
        <SoundToggle />
      </div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <div
            className={streakPulse ? "anim-streak-pulse" : undefined}
            style={{
              background: ACCENT,
              color: "#fff",
              padding: "5px 14px",
              borderRadius: "20px",
              fontSize: "0.85rem",
              fontWeight: 700,
            }}
          >
            🔥 {correct}
          </div>
          <div
            style={{
              padding: "5px 14px",
              borderRadius: "20px",
              fontSize: "0.78rem",
              fontWeight: 600,
              border: `1px solid ${diffClass.border}`,
              color: diffClass.color,
              background: diffClass.bg,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {DIFF_LABELS[q.d]}
          </div>
          <div
            style={{
              background: "var(--panel-alt)",
              color: "var(--text-dim)",
              padding: "5px 14px",
              borderRadius: "20px",
              fontSize: "0.78rem",
              border: "1px solid var(--border)",
            }}
          >
            {categoryName}
          </div>
        </div>
        <div style={{ fontSize: "0.9rem", color: "var(--text-dim)" }}>
          Score: <span style={{ color: "var(--text)", fontWeight: 700 }}>{score}</span>
        </div>
      </div>

      {/* Timer */}
      <div style={{ marginBottom: "16px" }} className={timerSecs <= 3 ? "anim-glow-pulse" : undefined}>
        <div
          style={{
            background: "var(--panel-alt)",
            borderRadius: "4px",
            height: "5px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${timerPct}%`,
              background: timerColor,
              borderRadius: "4px",
              transition: "width 0.1s linear, background 0.4s",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "4px",
            fontSize: "0.78rem",
            color: "var(--text-dim)",
          }}
        >
          Time:{" "}
          <span
            style={{
              color: "var(--text)",
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              marginLeft: "4px",
            }}
          >
            {timerSecs}s
          </span>
        </div>
      </div>

      {/* Question */}
      <div
        ref={questionCardRef}
        className={[
          "bd-question-card",
          questionAnim === "out" ? "anim-question-out" : "",
          questionAnim === "in" ? "anim-question-in" : "",
        ].filter(Boolean).join(" ")}
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border-hi)",
          borderRadius: "14px",
          padding: "32px 28px 24px",
          marginBottom: "16px",
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: "0.72rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-dim)",
            marginBottom: "12px",
          }}
        >
          Question {qi + 1} of {questions.length}
        </div>
        <div
          style={{
            fontFamily: '"Playfair Display", serif',
            fontSize: "clamp(1.3rem, 2.8vw, 1.75rem)",
            lineHeight: 1.3,
            color: "var(--text)",
          }}
        >
          {q.q}
        </div>
        {scoreFloat !== null && (
          <div
            className="anim-score-float"
            style={{
              position: "absolute",
              top: "12px",
              right: "16px",
              color: "#22c55e",
              fontWeight: 800,
              fontSize: "1.1rem",
            }}
          >
            +{scoreFloat}
          </div>
        )}
      </div>

      {/* Answers */}
      <div
        className="bd-answers"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "10px",
        }}
      >
        {q.a.map((ans, i) => {
          const showCorrect =
            (answered !== "idle" && i === q.c);
          const showWrong = answered === "wrong" && i === selectedIdx;
          const disabled = answered !== "idle";

          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => handleAnswer(i)}
              className={
                showCorrect ? "anim-pop-in" : showWrong ? "anim-shake" : undefined
              }
              style={{
                background: showCorrect
                  ? "rgba(34,197,94,0.1)"
                  : showWrong
                    ? "rgba(255,60,60,0.1)"
                    : "var(--panel)",
                border: `1.5px solid ${
                  showCorrect ? "#22c55e" : showWrong ? ACCENT : "var(--border-hi)"
                }`,
                color: "var(--text)",
                padding: "16px",
                borderRadius: "10px",
                cursor: disabled ? "default" : "pointer",
                fontFamily: "inherit",
                fontSize: "0.93rem",
                fontWeight: 500,
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                lineHeight: 1.35,
                opacity: disabled && !showCorrect && !showWrong ? 0.45 : 1,
                transition: "border-color 0.1s, background 0.1s",
              }}
            >
              <span
                style={{
                  background: showCorrect
                    ? "#22c55e"
                    : showWrong
                      ? ACCENT
                      : "var(--panel-alt)",
                  color: showCorrect || showWrong ? "#fff" : "var(--text-dim)",
                  width: "27px",
                  height: "27px",
                  borderRadius: "5px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {LETTERS[i]}
              </span>
              {ans}
            </button>
          );
        })}
      </div>
    </div>
  );
}
