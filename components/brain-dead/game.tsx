"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CategoryId, GameMode, Question } from "@/lib/brain-dead/types";
import { appendUniqueQuestions } from "@/lib/brain-dead/trivia-api";
import {
  loadSeenQuestionIds,
  recordSeenQuestionIds,
} from "@/lib/brain-dead/seen-questions";
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
import { burstFrom } from "@/lib/motion/burst";
import { impactRing } from "@/lib/motion/impact-ring";
import { juiceLevel } from "@/lib/motion/juice-level";
import { useCountUp } from "@/lib/motion/count-up";
import { GameTitle } from "@/components/ui/game-title";
import { OtherDailies } from "@/components/daily/other-dailies";
import { ShareResult } from "@/components/daily/share-result";
import { brainDeadShare } from "@/lib/share/results";
import { getDateString as shareDate } from "@/lib/streak/date";
import { DailyCompleteShell } from "@/components/daily/daily-complete-shell";
import { WinStreakLine } from "@/components/streak/streak-notifier";
import DailyIntroModal from "@/components/brain-dead/daily-intro-modal";
import { LifeSigns } from "@/components/brain-dead/life-signs";
import { LIFE_SIGNS_LABELS, lifeSignsTier, nextMilestone } from "@/lib/brain-dead/life-signs";

type Screen = "played" | "game" | "result";

/** The finish screen is drawn outside the game page, so it needs the game's colours handed to it. */
const OVERLAY_THEME = {
  "--bg": "var(--bd-bg)",
  "--text": "var(--bd-text)",
  "--text-dim": "var(--bd-text-muted)",
} as React.CSSProperties;

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
  const [todayCorrect, setTodayCorrect] = useState(0);
  const [scoreFloat, setScoreFloat] = useState<number | null>(null);
  const [questionAnim, setQuestionAnim] = useState<"in" | "out" | null>(null);
  const [showIntro, setShowIntro] = useState(mode === "daily");

  const [fetchError, setFetchError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const tokenRef = useRef("");
  const seenIdsRef = useRef<string[]>([]);
  const { play } = useSound();
  const questionCardRef = useRef<HTMLDivElement>(null);
  const playAreaRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const streakRef = useRef<HTMLDivElement>(null);
  const displayScore = useCountUp(score, true, 400, true);
  const lastTickSecondRef = useRef<number | null>(null);
  const timeoutSoundPlayedRef = useRef(false);
  const resultCelebratedRef = useRef(false);
  const screenRef = useRef<Screen>("game");

  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const router = useRouter();
  const isDaily = mode === "daily";
  const q = questions[qi];
  const [completeOpen, setCompleteOpen] = useState(false);

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    if (score > 0) triggerAnimation(scoreRef.current, "anim-score-slam", 320);
  }, [score]);

  useEffect(() => {
    if (!isDaily || (screen !== "played" && screen !== "result")) {
      setCompleteOpen(false);
      return;
    }
    const timer = setTimeout(() => setCompleteOpen(true), 350);
    return () => clearTimeout(timer);
  }, [isDaily, screen]);

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
          triggerAnimation(questionCardRef.current, "anim-flash-red", 500);
          triggerAnimation(playAreaRef.current, "anim-screen-shake", 250);
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

  const fetchMoreQuestions = useCallback(async (initial = false) => {
    if (loadingRef.current) return;
    if (fetchError) return;
    loadingRef.current = true;
    setFetchError(null);
    try {
      const params = new URLSearchParams({
        count: initial ? "50" : "20",
      });
      if (category !== "random") params.set("category", category);
      if (tokenRef.current) params.set("token", tokenRef.current);
      const seen = seenIdsRef.current.length
        ? seenIdsRef.current
        : loadSeenQuestionIds(category);
      seenIdsRef.current = seen;
      if (seen.length) params.set("seen", seen.join(","));

      const res = await fetch(`/api/brain-dead/questions?${params}`);
      if (!res.ok) throw new Error("Failed to fetch questions");
      const data = await res.json();

      if (data.questions?.length) {
        const incomingIds = data.questions
          .map((q: Question & { id?: string }) => q.id)
          .filter((id: string | undefined): id is string => Boolean(id));
        seenIdsRef.current = recordSeenQuestionIds(category, incomingIds);

        if (screenRef.current === "game") {
          setQuestions((prev) => appendUniqueQuestions(prev, data.questions));
        }
        tokenRef.current = data.token ?? tokenRef.current;
      } else if (initial) {
        setFetchError("No new questions available. Try a different category.");
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
    void fetchMoreQuestions(true);
  }, [clearTimers, fetchMoreQuestions]);

  useEffect(() => {
    let cancelled = false;

    if (isDaily) {
      const played = getDailyPlayed();
      if (played) {
        setTodayScore(played.score);
        setTodayCorrect(played.correct);
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
      seenIdsRef.current = loadSeenQuestionIds(category);
      beginGame([]);
      void fetchMoreQuestions(true);
    }

    return () => { cancelled = true; clearTimers(); };
    // Initial freeplay load only — refills use the prefetch effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDaily, category]);

  useEffect(() => {
    if (screen === "game" && q && answered === "idle" && !showIntro) {
      startTimer();
    }
    return clearIntervalTimer;
  }, [screen, qi, q, answered, showIntro, startTimer, clearIntervalTimer]);

  const handleAnswer = (idx: number, btn: HTMLElement) => {
    if (!q || answered !== "idle") return;
    play("ui.tap");
    clearIntervalTimer();
    const timeTaken = (Date.now() - startTimeRef.current) / 1000;
    setTimes((prev) => [...prev, timeTaken]);

    setSelectedIdx(idx);
    if (idx === q.c) {
      const points = calcScore(q.d, timeTaken);
      play("correct");
      const nextCorrect = correct + 1;
      triggerAnimation(questionCardRef.current, "anim-flash-green", 500);
      impactRing(btn, "var(--bd-success)");
      void burstFrom(btn, juiceLevel(nextCorrect), "correct");
      if (nextCorrect === 3 || nextCorrect === 5 || nextCorrect === 8) {
        triggerAnimation(streakRef.current, "anim-streak-pulse", 400);
      }
      setScoreFloat(points);
      setTimeout(() => setScoreFloat(null), 900);
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
      triggerAnimation(questionCardRef.current, "anim-flash-red", 500);
      impactRing(btn, "var(--bd-danger)");
      triggerAnimation(playAreaRef.current, "anim-screen-shake", 250);
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
    if (questions.length === 0) return;

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

  const freeplayBackHref = "/brain-dead/freeplay";
  const backHref = isDaily ? "/brain-dead" : freeplayBackHref;

  // `bare` drops the header: the finish overlay already has its own Home and close controls.
  const gameShell = (
    children: React.ReactNode,
    options?: { bare?: boolean; useRouterBack?: boolean; stats?: React.ReactNode },
  ) => (
    <div className="bd-game">
      {!options?.bare && (
        <header className="bd-head">
          {options?.useRouterBack ? (
            <button type="button" className="bd-back" onClick={() => router.push(backHref)}>
              &larr; Back
            </button>
          ) : (
            <Link href={backHref} className="bd-back">
              &larr; Back
            </Link>
          )}
          <GameTitle game="brain-dead" as="h1" className="bd-title" />
          <span />
          {options?.stats && <div className="bd-stats-line">{options.stats}</div>}
        </header>
      )}
      {children}
    </div>
  );

  const inOverlay = isDaily && completeOpen;

  const dailyLinks = (
    <>
      <div className="bd-links">
        <Link href="/brain-dead/freeplay" className="bd-btn">
          Play Free Mode
        </Link>
        <Link href="/brain-dead/leaderboard" className="bd-btn">
          Leaderboard
        </Link>
      </div>
      <p className="bd-note">Daily locked. Come back tomorrow for a new set.</p>
    </>
  );

  /* ── Already played ── */
  if (screen === "played") {
    return (
      <DailyCompleteShell
        enabled={isDaily}
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        ariaLabel="Daily complete"
        style={OVERLAY_THEME}
      >
        {gameShell(
          <div className="bd-result">
            <p className="bd-eyebrow">Today&apos;s result</p>
            <div className="bd-big">{todayCorrect}</div>
            <div className="bd-big-label">correct</div>
            <div className="bd-stats">
              <div>
                <b>{todayScore}</b>
                <span>Score</span>
              </div>
              <div>
                <b>{countdown}</b>
                <span>Next challenge</span>
              </div>
            </div>

            {isDaily && (
              <div className="bd-result-actions">
                <WinStreakLine gameId="brain-dead" accentColor="var(--bd-primary)" />
                <ShareResult gameId="brain-dead" text={brainDeadShare(todayCorrect, todayScore, shareDate())} />
              </div>
            )}
            {dailyLinks}
            {isDaily && <OtherDailies currentGameId="brain-dead" />}
          </div>,
          { bare: inOverlay },
        )}
      </DailyCompleteShell>
    );
  }

  /* ── Result ── */
  if (screen === "result") {
    return (
      <DailyCompleteShell
        enabled={isDaily}
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        ariaLabel="Daily complete"
        style={OVERLAY_THEME}
      >
        {gameShell(
          <div className="bd-result anim-fade-slide-up">
            <div className="bd-badge" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="7" />
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
              </svg>
            </div>
            <h2>{result.title}</h2>
            <p className="bd-result-sub">{result.sub}</p>

            <div className="bd-big">{correct}</div>
            <div className="bd-big-label">correct</div>
            <div className="bd-stats">
              <div>
                <b>{score}</b>
                <span>Score</span>
              </div>
              <div>
                <b>{avgSpeed}s</b>
                <span>Avg time</span>
              </div>
            </div>

            {isDaily && !submitted && (
              <div className="bd-record">
                <input
                  className="bd-name"
                  placeholder="Enter your name"
                  aria-label="Your name for the leaderboard"
                  maxLength={20}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                />
                <button type="button" className="bd-btn is-accent" onClick={handleSubmitScore} disabled={submitting}>
                  {submitting ? "Saving..." : "Record score"}
                </button>
                {submitError && <p className="bd-record-note is-error">Could not save score. Try again.</p>}
              </div>
            )}
            {isDaily && submitted && <p className="bd-record-note is-ok">Score recorded.</p>}

            {isDaily ? (
              <>
                <div className="bd-result-actions">
                  <WinStreakLine gameId="brain-dead" accentColor="var(--bd-primary)" />
                  <ShareResult
                    gameId="brain-dead"
                    text={brainDeadShare(correct, score, shareDate(), questions.length || 15)}
                  />
                </div>
                {dailyLinks}
                <OtherDailies currentGameId="brain-dead" />
              </>
            ) : (
              <>
                <div className="bd-result-actions">
                  <button type="button" className="bd-cta" onClick={handleFreeplayRestart}>
                    Play Again
                  </button>
                </div>
                <div className="bd-links">
                  <button type="button" className="bd-btn" onClick={() => router.push(freeplayBackHref)}>
                    Change Category
                  </button>
                  <button type="button" className="bd-btn" onClick={() => router.push("/")}>
                    Home
                  </button>
                </div>
              </>
            )}
          </div>,
          { bare: inOverlay, useRouterBack: !isDaily },
        )}
      </DailyCompleteShell>
    );
  }

  const intro = isDaily && showIntro && (
    <DailyIntroModal
      onStart={() => {
        play("ui.tap");
        setShowIntro(false);
      }}
    />
  );

  /* ── Game ── */
  if (!q) {
    return gameShell(
      <>
        {intro}
        <div className="bd-state">{fetchError ?? "Loading questions…"}</div>
      </>,
    );
  }

  const diffClass =
    q.d === 1
      ? { color: "var(--bd-success)", label: "Easy" }
      : q.d === 2
        ? { color: "var(--bd-primary)", label: "Medium" }
        : q.d === 3
          ? { color: "var(--bd-danger)", label: "Hard" }
          : { color: "var(--bd-secondary)", label: "Brutal" };

  // A wrong answer or a timeout ends the run, and the monitor flatlines with it.
  const runOver = answered === "wrong" || answered === "timeout";
  const milestone = nextMilestone(correct);

  const stats = (
    <>
      <span className="bd-count">
        Question
        <b>{qi + 1}</b>
        {isDaily && `/ ${questions.length}`}
      </span>
      <span className="bd-score">
        Score
        <span ref={scoreRef} className="bd-score-n">
          {displayScore}
        </span>
      </span>
    </>
  );

  return gameShell(
    <>
      {intro}

      <div ref={playAreaRef} className="bd-play" style={{ "--juice": juiceLevel(correct) } as React.CSSProperties}>
        <LifeSigns streak={correct} dead={runOver} />
        <div className={`bd-vitals${runOver ? " is-dead" : ""}`} data-tier={lifeSignsTier(runOver ? 0 : correct)}>
          <div ref={streakRef} className="bd-vitals-now">
            <b>{correct}</b>
            {runOver ? "Flatline" : LIFE_SIGNS_LABELS[lifeSignsTier(correct)]}
          </div>
          {!runOver && milestone && (
            <span className="bd-vitals-next">
              {milestone.label} at {milestone.at}
            </span>
          )}
        </div>

        <div className="bd-body">
          <div className="bd-ask">
            <div
              ref={questionCardRef}
              className={[
                "bd-question-card",
                questionAnim === "out" ? "anim-question-out" : "",
                questionAnim === "in" ? "anim-question-in" : "",
              ].filter(Boolean).join(" ")}
            >
              <div className="bd-q-meta">
                <span className="bd-diff" style={{ "--bd-diff": diffClass.color } as React.CSSProperties}>
                  {diffClass.label}
                </span>
                <span>{q.d * 100} pts</span>
                <span aria-hidden="true">·</span>
                <span>{categoryName}</span>
              </div>
              <div className="bd-question">{q.q}</div>
              {scoreFloat !== null && <div className="bd-float anim-score-float">+{scoreFloat}</div>}
            </div>

            <div className="bd-timer">
              <div className="bd-timer-track">
                <div className="bd-timer-fill" style={{ width: `${timerPct}%`, background: timerColor }} />
              </div>
              <span className="bd-timer-secs" style={{ color: timerColor }}>
                {timerSecs}s
              </span>
            </div>
          </div>

          <div className="bd-answers">
            {q.a.map((ans, i) => {
              const showCorrect = answered !== "idle" && i === q.c;
              const showWrong = answered === "wrong" && i === selectedIdx;
              const disabled = answered !== "idle";

              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={(e) => handleAnswer(i, e.currentTarget)}
                  className={[
                    "bd-answer-btn",
                    "bd-answer",
                    showCorrect ? "is-correct anim-pop-in" : showWrong ? "is-wrong anim-shake" : disabled ? "is-dim" : "",
                  ].filter(Boolean).join(" ")}
                >
                  <span className="bd-letter">{LETTERS[i]}</span>
                  <span>{ans}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>,
    { stats },
  );
}
