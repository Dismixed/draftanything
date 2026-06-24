"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { CategoryId, GameMode, Question } from "@/lib/brain-dead/types";
import {
  TIMER_MAX,
  LETTERS,
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
import { AccountPrompt } from "@/components/auth/account-prompt";

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
  const [questionAnim, setQuestionAnim] = useState<"in" | "out" | null>(null);

  const [fetchError, setFetchError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const tokenRef = useRef("");
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
      setFetchError(null);
    },
    [clearTimers],
  );

  /* ------------------------------------------------------------------ */
  /*  Fetch questions — freeplay (batched, token-managed)                */
  /* ------------------------------------------------------------------ */

  const fetchMoreQuestions = useCallback(async () => {
    if (loadingRef.current) return;
    if (fetchError) return;
    loadingRef.current = true;
    setFetchError(null);
    try {
      const params = new URLSearchParams({ count: "20" });
      if (category !== "random") params.set("category", category);
      if (tokenRef.current) params.set("token", tokenRef.current);

      const res = await fetch(`/api/brain-dead/questions?${params}`);
      if (!res.ok) throw new Error("Failed to fetch questions");
      const data = await res.json();

      if (data.questions?.length) {
        setQuestions((prev) => [...prev, ...data.questions]);
        tokenRef.current = data.token ?? tokenRef.current;
      }
    } catch {
      setFetchError("Could not load more questions. Check your connection.");
    } finally {
      loadingRef.current = false;
    }
  }, [category, fetchError]);

  /* ------------------------------------------------------------------ */
  /*  Restart freeplay from result screen                                */
  /* ------------------------------------------------------------------ */

  const handleFreeplayRestart = useCallback(() => {
    clearTimers();
    setQuestions([]);
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
    setFetchError(null);
    tokenRef.current = "";
    loadingRef.current = false;
  }, [clearTimers]);

  useEffect(() => {
    let cancelled = false;

    if (isDaily) {
      const played = getDailyPlayed();
      if (played) {
        setTodayScore(played.score);
        setCountdown(getCountdownText());
        setScreen("played");
        const iv = setInterval(() => setCountdown(getCountdownText()), 1000);
        return () => { cancelled = true; clearInterval(iv); };
      }
      beginGame([]);
      fetch("/api/brain-dead/daily")
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((data) => {
          if (cancelled) return;
          if (data.questions?.length) {
            setQuestions(data.questions);
          } else {
            setFetchError("No questions available today. Try again later.");
          }
        })
        .catch(() => {
          if (!cancelled) setFetchError("Could not load daily questions.");
        });
    } else {
      beginGame([]);
    }

    return () => { cancelled = true; clearTimers(); };
  }, [isDaily, beginGame, clearTimers]);

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

  /* Daily: end game when out of questions (fixed set) */
  useEffect(() => {
    if (isDaily && screen === "game" && questions.length > 0 && qi >= questions.length) {
      endGame();
    }
  }, [isDaily, screen, qi, questions.length, endGame]);

  /* Freeplay: prefetch questions when buffer drops below threshold */
  useEffect(() => {
    if (isDaily) return;
    if (screen !== "game") return;
    if (fetchError) return;

    const remaining = questions.length - qi;
    if (remaining <= 5) {
      fetchMoreQuestions();
    }
  }, [isDaily, screen, qi, questions.length, fetchError, fetchMoreQuestions]);

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
            background: "var(--bd-surface)",
            border: "1px solid var(--bd-border)",
            borderRadius: "12px",
            padding: "40px 32px",
            maxWidth: "380px",
            margin: "0 auto",
          }}
        >
          <div style={{ marginBottom: "16px" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--bd-text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 700,
              margin: "0 0 16px",
              color: "var(--bd-text)",
            }}
          >
            Come back tomorrow
          </h2>
          <div
            style={{
              fontSize: "40px",
              fontWeight: 700,
              color: "var(--bd-primary)",
              lineHeight: 1,
            }}
          >
            {todayScore}
          </div>
          <div style={{ color: "var(--bd-text-muted)", fontSize: "12px", marginTop: "8px" }}>
            your score today
          </div>
          <div
            style={{
              width: "40px",
              height: "2px",
              background: "var(--bd-primary)",
              margin: "16px auto",
            }}
          />
          <div
            style={{
              fontSize: "10px",
              color: "var(--bd-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            Next challenge
          </div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: 700,
              marginTop: "4px",
              fontVariantNumeric: "tabular-nums",
              color: "var(--bd-text)",
            }}
          >
            {countdown}
          </div>
          <div style={{ marginTop: "32px" }}>
            <Link
              href="/brain-dead/freeplay"
              style={{
                display: "inline-block",
                textDecoration: "none",
                background: "transparent",
                border: "1px solid var(--bd-border)",
                color: "var(--bd-text-secondary)",
                padding: "10px 24px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 600,
                transition: "border-color 0.2s",
              }}
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
        <div style={{ marginBottom: "16px" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--bd-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="7"/>
            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
          </svg>
        </div>
        <h2
          style={{
            fontSize: "20px",
            fontWeight: 700,
            margin: "0 0 8px",
            color: "var(--bd-text)",
          }}
        >
          {result.title}
        </h2>
        <p
          style={{
            color: "var(--bd-text-muted)",
            fontSize: "12px",
            maxWidth: "380px",
            margin: "0 auto 24px",
            lineHeight: 1.6,
          }}
        >
          {result.sub}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "8px",
            marginBottom: "24px",
            maxWidth: "380px",
            margin: "0 auto 24px",
          }}
        >
          {[
            { val: correct, lbl: "Correct" },
            { val: score, lbl: "Score" },
            { val: `${avgSpeed}s`, lbl: "Avg Time" },
          ].map(({ val, lbl }) => (
            <div
              key={lbl}
              style={{
                background: "var(--bd-surface)",
                border: "1px solid var(--bd-border)",
                borderRadius: "8px",
                padding: "12px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "var(--bd-primary)",
                  lineHeight: 1,
                }}
              >
                {val}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: "var(--bd-text-muted)",
                  marginTop: "2px",
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
              marginBottom: "16px",
              maxWidth: "380px",
              margin: "0 auto 16px",
            }}
          >
            <input
              placeholder="Enter your name"
              maxLength={20}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              style={{
                width: "100%",
                background: "var(--bd-surface)",
                border: "1px solid var(--bd-border)",
                borderRadius: "8px",
                padding: "10px 12px",
                color: "var(--bd-text)",
                fontSize: "13px",
                outline: "none",
                textAlign: "center",
                fontFamily: "inherit",
              }}
            />
            <button
              type="button"
              onClick={handleSubmitScore}
              disabled={submitting}
              style={{
                width: "100%",
                background: "transparent",
                border: "1px solid var(--bd-primary)",
                color: "var(--bd-primary)",
                padding: "12px",
                fontFamily: "inherit",
                fontSize: "13px",
                fontWeight: 600,
                borderRadius: "8px",
                cursor: submitting ? "default" : "pointer",
                opacity: submitting ? 0.7 : 1,
                letterSpacing: "0.5px",
              }}
            >
              {submitting ? "Submitting..." : "RECORD SCORE"}
            </button>
            {submitError && (
              <p style={{ color: "var(--bd-danger)", fontSize: "12px", margin: 0 }}>
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
              background: "var(--bd-primary)",
              color: "#fff",
              border: "none",
              padding: "12px 28px",
              fontSize: "13px",
              fontWeight: 700,
              borderRadius: "8px",
              textDecoration: "none",
              marginBottom: "16px",
            }}
          >
            View Leaderboard
          </Link>
        )}

        {submitted && <AccountPrompt />}

        <div
          style={{
            display: "flex",
            gap: "8px",
            justifyContent: "center",
            flexWrap: "wrap",
            marginTop: "16px",
          }}
        >
          {!isDaily && (
            <>
              <button
                type="button"
                onClick={handleFreeplayRestart}
                style={{
                  background: "var(--bd-surface)",
                  border: "1px solid var(--bd-border)",
                  color: "var(--bd-text-muted)",
                  padding: "10px 24px",
                  fontFamily: "inherit",
                  fontSize: "12px",
                  fontWeight: 600,
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                Play Again
              </button>
              <Link
                href="/brain-dead/freeplay"
                style={{
                  textDecoration: "none",
                  background: "var(--bd-surface)",
                  border: "1px solid var(--bd-border)",
                  color: "var(--bd-text-muted)",
                  padding: "10px 24px",
                  fontSize: "12px",
                  fontWeight: 600,
                  borderRadius: "8px",
                  display: "inline-block",
                }}
              >
                Change Category
              </Link>
            </>
          )}
          <Link
            href="/brain-dead"
            style={{
              textDecoration: "none",
              background: "var(--bd-surface)",
              border: "1px solid var(--bd-border)",
              color: "var(--bd-text-muted)",
              padding: "10px 24px",
              fontSize: "12px",
              fontWeight: 600,
              borderRadius: "8px",
              display: "inline-block",
            }}
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
      ? { color: "var(--bd-success)", label: "Easy" }
      : q.d === 2
        ? { color: "var(--bd-primary)", label: "Medium" }
        : q.d === 3
          ? { color: "var(--bd-danger)", label: "Hard" }
          : { color: "var(--bd-secondary)", label: "Brutal" };

  return (
    <div style={{ width: "100%", maxWidth: "480px", margin: "0 auto", position: "relative" }}>
      <div style={{ position: "absolute", top: 0, right: 0, zIndex: 2 }}>
        <SoundToggle />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div style={{ fontSize: "11px", color: "var(--bd-text-muted)", fontWeight: 500 }}>
          <span style={{ color: "var(--bd-primary)" }}>{qi + 1}</span> / {questions.length}
        </div>
        <div style={{ fontSize: "11px", color: "var(--bd-text-muted)", fontWeight: 500 }}>
          Score: <span style={{ color: "var(--bd-primary)", fontWeight: 600 }}>{score}</span>
        </div>
      </div>

      {/* Timer */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginBottom: "4px" }}>
          <span style={{ color: "var(--bd-text-muted)" }}>{categoryName}</span>
          <span style={{ color: "var(--bd-primary)" }}>{timerSecs}s</span>
        </div>
        <div
          style={{
            width: "100%",
            height: "4px",
            background: "var(--bd-surface)",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${timerPct}%`,
              background: timerColor,
              borderRadius: "2px",
              transition: "width 0.1s linear, background 0.4s",
            }}
          />
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
          background: "var(--bd-surface)",
          border: "1px solid var(--bd-border)",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "16px",
          textAlign: "center",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span style={{ fontSize: "10px", color: diffClass.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>
            {diffClass.label}
          </span>
          <span style={{ fontSize: "10px", color: "var(--bd-border)" }}>|</span>
          <span style={{ fontSize: "10px", color: "var(--bd-text-muted)" }}>{q.d * 100} pts</span>
        </div>
        <div
          style={{
            fontSize: "16px",
            fontWeight: 500,
            lineHeight: 1.4,
            color: "var(--bd-text)",
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
              color: "var(--bd-success)",
              fontWeight: 800,
              fontSize: "14px",
            }}
          >
            +{scoreFloat}
          </div>
        )}
      </div>

      {/* Answers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          marginBottom: "16px",
        }}
      >
        {q.a.map((ans, i) => {
          const showCorrect = answered !== "idle" && i === q.c;
          const showWrong = answered === "wrong" && i === selectedIdx;
          const disabled = answered !== "idle";

          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => handleAnswer(i)}
              className={
                [
                  "bd-answer-btn",
                  showCorrect ? "anim-pop-in" : showWrong ? "anim-shake" : "",
                ].filter(Boolean).join(" ") || undefined
              }
              style={{
                background: showCorrect
                  ? "rgba(34,197,94,0.1)"
                  : showWrong
                    ? "rgba(239,68,68,0.1)"
                    : "var(--bd-surface)",
                border: `1px solid ${
                  showCorrect ? "var(--bd-success)" : showWrong ? "var(--bd-danger)" : "var(--bd-border)"
                }`,
                color: "var(--bd-text)",
                padding: "12px",
                borderRadius: "8px",
                cursor: disabled ? "default" : "pointer",
                fontFamily: "inherit",
                fontSize: "13px",
                fontWeight: 500,
                textAlign: "center",
                opacity: disabled && !showCorrect && !showWrong ? 0.45 : 1,
                transition: "border-color 0.1s, background 0.1s",
              }}
            >
              <div style={{ fontSize: "11px", color: showCorrect || showWrong ? diffClass.color : "var(--bd-text-secondary)", marginBottom: "2px" }}>
                {LETTERS[i]}
              </div>
              <div>{ans}</div>
            </button>
          );
        })}
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "10px", color: "var(--bd-text-muted)", marginBottom: "4px" }}>Streak</div>
        <div style={{ display: "flex", justifyContent: "center", gap: "4px" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                width: "8px",
                height: "8px",
                background: i < correct ? "var(--bd-primary)" : "var(--bd-border)",
                borderRadius: "50%",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
