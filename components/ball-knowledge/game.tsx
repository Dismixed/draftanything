"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { GameBackLink } from "@/components/ui/game-back-link";
import { GameHowItWorksModal } from "@/components/ui/game-how-it-works-modal";
import { ballKnowledgeShare } from "@/lib/share/results";
import { FinishScreen } from "@/components/daily/finish-screen";
import { finishCurve, useDailyPercentile } from "@/lib/games/use-daily-percentile";
import { BallKnowledgeFinishResult } from "./finish-result";
import { AnswerRow } from "./answer-row";
import { useGameHowItWorks } from "@/lib/game-how-it-works";
import { useTheme, setThemeColorOverride } from "@/lib/theme/theme-context";
import { burstFrom } from "@/lib/motion/burst";
import { juiceLevel } from "@/lib/motion/juice-level";
import { triggerAnimation } from "@/lib/motion/trigger-class";
import {
  CLOCK_CIRCUMFERENCE,
  TOTAL_TIME,
} from "@/lib/ball-knowledge/game-logic";
import { findMatch } from "@/lib/ball-knowledge/normalize";
import {
  fetchTodayLeaderboard,
  getDailyPlayed,
  saveDailyPlayed,
  saveLeaderboardEntry,
} from "@/lib/ball-knowledge/storage";
import type { AnswerEntry, LeaderboardEntry } from "@/lib/ball-knowledge/types";

type Screen = "start" | "game" | "end" | "played";

const SAMPLE_CATEGORIES = [
  "Pizza Toppings",
  "90s Cartoons",
  "Dog Breeds",
  "US State Capitals",
  "Taylor Swift Albums",
  "Breakfast Cereals",
] as const;

export default function BallKnowledgeGame({
  category,
}: {
  category: string;
}) {
  const [screen, setScreen] = useState<Screen>("start");
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [entries, setEntries] = useState<AnswerEntry[]>([]);
  const [accepted, setAccepted] = useState<string[]>([]);
  const [acceptedCanonicals, setAcceptedCanonicals] = useState<Set<string>>(
    () => new Set(),
  );
  const [roundOver, setRoundOver] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [joining, setJoining] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [playedScore, setPlayedScore] = useState(0);
  const { showHowItWorks, dismissHowItWorks } = useGameHowItWorks("ball-knowledge");
  const [completeOpen, setCompleteOpen] = useState(false);
  const { theme } = useTheme();

  const answerInputRef = useRef<HTMLInputElement>(null);
  const scoreNumRef = useRef<HTMLDivElement>(null);
  const prevScoreRef = useRef(0);
  const entryCounterRef = useRef(0);
  const pendingCountRef = useRef(0);
  const judgeQueueRef = useRef(Promise.resolve());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedEntryIdRef = useRef<string | null>(null);
  const acceptedRef = useRef<string[]>([]);

  const score = accepted.length;

  useEffect(() => {
    if (score > prevScoreRef.current) {
      triggerAnimation(scoreNumRef.current, "anim-score-slam", 320);
      void burstFrom(scoreNumRef.current, juiceLevel(score), "blue");
    }
    prevScoreRef.current = score;
  }, [score]);

  useEffect(() => {
    acceptedRef.current = accepted;
  }, [accepted]);

  // Match browser chrome to the court bg (not the global cream/midnight)
  useEffect(() => {
    const court =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--bk-court-navy")
        .trim() || (theme === "light" ? "#eef4fc" : "#0a1830");
    setThemeColorOverride(court);
    return () => setThemeColorOverride(null);
  }, [theme]);

  useEffect(() => {
    if (screen !== "end" && screen !== "played") {
      setCompleteOpen(false);
      return;
    }
    const timer = setTimeout(() => setCompleteOpen(true), 350);
    return () => clearTimeout(timer);
  }, [screen]);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2200);
  }, []);

  const updateEntry = useCallback((id: string, patch: Partial<AnswerEntry>) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    );
  }, []);

  const acceptEntry = useCallback(
    (id: string, canonical: string) => {
      updateEntry(id, {
        status: "ok",
        displayText: canonical,
        reason: "",
      });
      setAcceptedCanonicals((prev) => new Set(prev).add(canonical));
      setAccepted((prev) => [...prev, canonical]);
    },
    [updateEntry],
  );

  const rejectEntry = useCallback(
    (id: string, reason: string) => {
      updateEntry(id, { status: "bad", reason });
    },
    [updateEntry],
  );

  const isDuplicate = useCallback(
    (canonical: string) => {
      const lower = canonical.toLowerCase();
      return accepted.some(
        (a) =>
          a.toLowerCase() === lower ||
          acceptedCanonicals.has(canonical),
      );
    },
    [accepted, acceptedCanonicals],
  );

  const aiJudge = useCallback(
    async (entry: AnswerEntry) => {
      try {
        const res = await fetch("/api/ball-knowledge/judge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category,
            answer: entry.text,
            accepted: acceptedRef.current,
          }),
        });

        if (!res.ok) {
          rejectEntry(entry.id, "couldn't verify");
          return;
        }

        const parsed = (await res.json()) as {
          valid: boolean;
          canonical?: string;
          reason?: string;
        };

        if (parsed.valid) {
          const canonical = parsed.canonical || entry.text;
          if (isDuplicate(canonical)) {
            rejectEntry(entry.id, "already got it");
          } else {
            acceptEntry(entry.id, canonical);
          }
        } else {
          rejectEntry(entry.id, parsed.reason || "not valid");
        }
      } catch {
        rejectEntry(entry.id, "couldn't verify");
      } finally {
        pendingCountRef.current -= 1;
      }
    },
    [acceptEntry, category, isDuplicate, rejectEntry],
  );

  const submitAnswer = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || roundOver) return;

      const id = `e${entryCounterRef.current++}`;
      const entry: AnswerEntry = {
        id,
        text: trimmed,
        displayText: trimmed,
        status: "pending",
        reason: "",
      };

      setEntries((prev) => [entry, ...prev]);

      const match = findMatch(category, trimmed);
      if (match) {
        if (acceptedCanonicals.has(match.canonical)) {
          rejectEntry(id, "already got it");
        } else {
          acceptEntry(id, match.canonical);
        }
        return;
      }

      pendingCountRef.current += 1;
      judgeQueueRef.current = judgeQueueRef.current
        .then(() => aiJudge(entry))
        .catch(() => {
          rejectEntry(id, "couldn't verify");
          pendingCountRef.current -= 1;
        });
    },
    [
      acceptEntry,
      acceptedCanonicals,
      aiJudge,
      category,
      rejectEntry,
      roundOver,
    ],
  );

  const loadLeaderboard = useCallback(async () => {
    setLbLoading(true);
    const rows = await fetchTodayLeaderboard();
    setLeaderboard(rows);
    setLbLoading(false);
  }, []);

  const finishRound = useCallback(() => {
    saveDailyPlayed(score, category);
    setScreen("end");
    void loadLeaderboard();
  }, [category, loadLeaderboard, score]);

  const endRoundWhenReady = useCallback(() => {
    setRoundOver(true);
    if (answerInputRef.current) {
      answerInputRef.current.disabled = true;
      answerInputRef.current.placeholder = "Time's up — grading last answers…";
    }

    finishCheckRef.current = setInterval(() => {
      if (pendingCountRef.current <= 0) {
        if (finishCheckRef.current) clearInterval(finishCheckRef.current);
        finishRound();
      }
    }, 150);
  }, [finishRound]);

  const startGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (finishCheckRef.current) clearInterval(finishCheckRef.current);

    entryCounterRef.current = 0;
    pendingCountRef.current = 0;
    judgeQueueRef.current = Promise.resolve();

    setTimeLeft(TOTAL_TIME);
    setEntries([]);
    setAccepted([]);
    setAcceptedCanonicals(new Set());
    setRoundOver(false);
    setScreen("game");

    setTimeout(() => {
      if (answerInputRef.current) {
        answerInputRef.current.disabled = false;
        answerInputRef.current.value = "";
        answerInputRef.current.placeholder =
          "Type an answer and hit enter…";
        answerInputRef.current.focus();
      }
    }, 50);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          endRoundWhenReady();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [endRoundWhenReady]);

  useEffect(() => {
    const played = getDailyPlayed();
    if (played && played.category === category) {
      setPlayedScore(played.score);
      setScreen("played");
      void loadLeaderboard();
    }
  }, [category, loadLeaderboard]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (finishCheckRef.current) clearInterval(finishCheckRef.current);
    };
  }, []);

  const handleJoin = async () => {
    const name = nameInput.trim();
    if (!name) {
      toast("Enter a name first");
      return;
    }
    setJoining(true);
    const result = await saveLeaderboardEntry(name, score);
    if (result.ok) {
      submittedEntryIdRef.current = result.id ?? null;
      toast("Added to today's leaderboard");
      await loadLeaderboard();
    } else {
      toast("Could not save — try again");
    }
    setJoining(false);
  };

  const clockOffset = CLOCK_CIRCUMFERENCE * (1 - timeLeft / TOTAL_TIME);
  const urgent = timeLeft <= 10 && screen === "game";

  const finishedScreen = screen === "end" || screen === "played";
  // A return visit reads the saved score; a round that just ended uses the live one.
  const finalScore = screen === "played" ? playedScore : score;
  const shareText = ballKnowledgeShare(category, finalScore);
  const standing = useDailyPercentile("ball-knowledge", finalScore, {
    enabled: finishedScreen,
    record: screen === "end",
  });

  const finishResult = (
    <BallKnowledgeFinishResult
      score={finalScore}
      category={category}
      entries={screen === "end" ? entries : null}
      join={
        screen === "end"
          ? { name: nameInput, onNameChange: setNameInput, onJoin: () => void handleJoin(), joining }
          : null
      }
      leaderboard={leaderboard}
      leaderboardLoading={lbLoading}
      myEntryId={submittedEntryIdRef.current}
    />
  );

  return (
    <>
    <main className="bk-page">
      <div className="bk-app">
        <div className="bk-brand">
          <div className="bk-brand-dot" />
          <span>Stim Games</span>
        </div>

        {/* Under the finish screen the page shows the same result, with a way back to the summary. */}
        {finishedScreen && !completeOpen && (
          <div className="bk-results">
            <div className="bk-back-link">
              <GameBackLink href="/" color="var(--bk-chalk-dim)" />
            </div>
            {finishResult}
            <button type="button" className="bk-btn-ghost" onClick={() => setCompleteOpen(true)}>
              Back to today&apos;s summary
            </button>
            {screen === "end" && (
              <button type="button" className="bk-btn-ghost" onClick={() => setScreen("start")}>
                Back to Start
              </button>
            )}
          </div>
        )}

        {screen === "start" && (
          <div className="bk-start">
            <div className="bk-back-link">
              <GameBackLink href="/" color="var(--bk-chalk-dim)" />
            </div>
            <h1 className="bk-title">
              BALL
              <br />
              <span className="bk-title-accent">KNOWLEDGE</span>
            </h1>
            <div className="bk-tagline">
              60 seconds. One random category. Name everything you know.
            </div>
            <div className="bk-category-chips" aria-hidden>
            </div>
            <div className="bk-category-panel">
              <div className="bk-category-eyebrow">Today&apos;s Category</div>
              <div className="bk-category-name">{category}</div>
            </div>
            <div className="bk-rules">
              You&apos;ve got <b>60 seconds</b>. Type as many correct answers as
              you can for today&apos;s category — pizza toppings, dog breeds,
              state capitals, anything. Spelling doesn&apos;t have to be perfect,
              but it has to be real.
            </div>
            <button type="button" className="bk-btn-primary" onClick={startGame}>
              START
            </button>
          </div>
        )}

        {screen === "game" && (
          <div className="bk-play">
            <div className="bk-game-top">
              <div className="bk-game-category">
                <small>Category</small>
                <span>{category}</span>
              </div>
              <div className={`bk-clock${urgent ? " urgent" : ""}`}>
                <svg width="68" height="68" viewBox="0 0 68 68">
                  <circle
                    className="bg"
                    cx="34"
                    cy="34"
                    r="28"
                    fill="none"
                    strokeWidth="5"
                  />
                  <circle
                    className="fg"
                    cx="34"
                    cy="34"
                    r="28"
                    fill="none"
                    strokeWidth="5"
                    strokeDasharray={CLOCK_CIRCUMFERENCE}
                    strokeDashoffset={clockOffset}
                  />
                </svg>
                <div className="bk-clock-num">{timeLeft}</div>
              </div>
            </div>
            <input
              ref={answerInputRef}
              type="text"
              className="bk-answer-input"
              placeholder="Type an answer and hit enter…"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  submitAnswer(e.currentTarget.value);
                  e.currentTarget.value = "";
                }
              }}
            />
            <div className="bk-score-row">
              <div className="bk-label">Score</div>
              <div ref={scoreNumRef} className="bk-num">{score}</div>
            </div>
            <div className="bk-answer-list">
              {entries.map((entry) => (
                <AnswerRow key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        )}
      </div>

      {showHowItWorks && (
        <GameHowItWorksModal
          subtitle="60 seconds · One category a day"
          rules={BALL_KNOWLEDGE_HOW_IT_WORKS}
          buttonLabel="Start Challenge"
          onDismiss={dismissHowItWorks}
          theme={{
            overlay: "var(--bk-overlay)",
            surface: "var(--bk-backboard)",
            border: "var(--bk-line)",
            accent: "var(--bk-net-blue)",
            text: "var(--bk-chalk)",
            textMuted: "var(--bk-chalk-dim)",
          }}
        />
      )}

      <div className={`bk-toast${showToast ? " show" : ""}`}>{toastMsg}</div>
    </main>
      <FinishScreen
        gameId="ball-knowledge"
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        result={finishResult}
        shareText={shareText}
        curve={finishCurve("ball-knowledge", standing)}
      />
    </>
  );
}

const BALL_KNOWLEDGE_HOW_IT_WORKS = [
  {
    title: "One Category, 60 Seconds",
    body: "Everyone gets the same category today: pizza toppings, dog breeds, state capitals, whatever is on the board. Name as many valid answers as you can before time runs out.",
  },
  {
    title: "Type and Enter",
    body: "Type an answer and hit enter. Accepted answers stack in your list; duplicates and wrong guesses get rejected.",
  },
  {
    title: "Close Enough Counts",
    body: "Spelling doesn't have to be perfect, but the answer has to be real. Obscure or joke answers won't make the cut.",
  },
  {
    title: "One Run Per Day",
    body: "Play once and post your score. Tomorrow gets a new category.",
  },
] as const;
