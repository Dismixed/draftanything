"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { GameBackLink } from "@/components/ui/game-back-link";
import { GameHowItWorksModal } from "@/components/ui/game-how-it-works-modal";
import { OtherDailies } from "@/components/daily/other-dailies";
import { isHowItWorksSeen, markHowItWorksSeen } from "@/lib/game-how-it-works";
import { WinStreakLine } from "@/components/streak/streak-notifier";
import {
  CLOCK_CIRCUMFERENCE,
  TOTAL_TIME,
  getCountdownText,
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
type EndTab = "ok" | "bad";

const SAMPLE_CATEGORIES = [
  "Pizza Toppings",
  "90s Cartoons",
  "Dog Breeds",
  "US State Capitals",
  "Taylor Swift Albums",
  "Breakfast Cereals",
] as const;

function AnswerRow({ entry }: { entry: AnswerEntry }) {
  const icon =
    entry.status === "pending" ? (
      <div className="bk-spin" />
    ) : entry.status === "ok" ? (
      "✓"
    ) : (
      "✕"
    );

  return (
    <div className={`bk-answer-row ${entry.status}`} data-id={entry.id}>
      <div className="bk-icon">{icon}</div>
      <div>{entry.displayText}</div>
      {entry.status !== "pending" && entry.reason ? (
        <div className="bk-reason">{entry.reason}</div>
      ) : null}
    </div>
  );
}

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
  const [endTab, setEndTab] = useState<EndTab>("ok");
  const [nameInput, setNameInput] = useState("");
  const [joining, setJoining] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [playedScore, setPlayedScore] = useState(0);
  const [showHowItWorks, setShowHowItWorks] = useState(
    () => !isHowItWorksSeen("ball-knowledge"),
  );

  const answerInputRef = useRef<HTMLInputElement>(null);
  const entryCounterRef = useRef(0);
  const pendingCountRef = useRef(0);
  const judgeQueueRef = useRef(Promise.resolve());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedEntryIdRef = useRef<string | null>(null);
  const acceptedRef = useRef<string[]>([]);

  const score = accepted.length;

  useEffect(() => {
    acceptedRef.current = accepted;
  }, [accepted]);

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
    const tick = () => setCountdown(getCountdownText());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (finishCheckRef.current) clearInterval(finishCheckRef.current);
    };
  }, []);

  const shareText = `I named ${score} ${score === 1 ? "thing" : "things"} in "${category}" on Ball Knowledge. Think you know more? Play on Stim Games.`;

  const copyShareText = async (platform: string) => {
    try {
      await navigator.clipboard.writeText(shareText);
      toast(`Copied! Paste it into ${platform}`);
    } catch {
      toast("Could not copy — select and copy manually");
    }
  };

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

  const endItems = entries.filter((e) => e.status === endTab);

  return (
    <main className="bk-page">
      <div className="bk-app">
        <div className="bk-brand">
          <div className="bk-brand-dot" />
          <span>Stim Games</span>
        </div>

        {screen === "played" && (
          <div className="bk-card" style={{ position: "relative" }}>
            <div className="bk-back-link">
              <GameBackLink href="/" color="var(--bk-chalk-dim)" />
            </div>
            <div className="bk-end-score">
              <div className="bk-end-num">{playedScore}</div>
              <div className="bk-end-lbl">Today&apos;s Ball Knowledge Score</div>
            </div>
            <p
              style={{
                textAlign: "center",
                fontSize: "13px",
                color: "var(--bk-chalk-dim)",
                marginBottom: "20px",
              }}
            >
              Category: <strong style={{ color: "var(--bk-chalk)" }}>{category}</strong>
            </p>
            <div className="bk-divider" />
            <div className="bk-section-label">Today&apos;s Leaderboard</div>
            {lbLoading ? (
              <div className="bk-empty-note">Loading leaderboard…</div>
            ) : leaderboard.length === 0 ? (
              <div className="bk-empty-note">No scores yet today.</div>
            ) : (
              leaderboard.slice(0, 10).map((row, i) => (
                <div key={row.id} className="bk-lb-row">
                  <div className="bk-lb-rank">{i + 1}</div>
                  <div className="bk-lb-name">{row.name}</div>
                  <div className="bk-lb-score">{row.score}</div>
                </div>
              ))
            )}
            {countdown ? (
              <p
                style={{
                  textAlign: "center",
                  fontSize: "11px",
                  color: "var(--bk-chalk-dim)",
                  marginTop: "16px",
                }}
              >
                Next category in {countdown}
              </p>
            ) : null}
            <div className="bk-streak-line">
              <WinStreakLine gameId="ball-knowledge" />
            </div>
            <OtherDailies currentGameId="ball-knowledge" />
          </div>
        )}

        {screen === "start" && (
          <div className="bk-card" style={{ position: "relative" }}>
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
              {SAMPLE_CATEGORIES.map((name) => (
                <span key={name} className="bk-category-chip">
                  {name}
                </span>
              ))}
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
          <div className="bk-card">
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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  submitAnswer(e.currentTarget.value);
                  e.currentTarget.value = "";
                }
              }}
            />
            <div className="bk-score-row">
              <div className="bk-label">Score</div>
              <div className="bk-num">{score}</div>
            </div>
            <div className="bk-answer-list">
              {entries.map((entry) => (
                <AnswerRow key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        )}

        {screen === "end" && (
          <div className="bk-card">
            <div className="bk-end-score">
              <div className="bk-end-num">{score}</div>
              <div className="bk-end-lbl">Ball Knowledge Score</div>
            </div>
            <div className="bk-tabs">
              <button
                type="button"
                className={`bk-tab${endTab === "ok" ? " active" : ""}`}
                onClick={() => setEndTab("ok")}
              >
                Accepted
              </button>
              <button
                type="button"
                className={`bk-tab${endTab === "bad" ? " active" : ""}`}
                onClick={() => setEndTab("bad")}
              >
                Missed
              </button>
            </div>
            <div className="bk-answer-list bk-end-list">
              {endItems.length === 0 ? (
                <div className="bk-empty-note">
                  {endTab === "ok"
                    ? "Nothing accepted this round."
                    : "Nothing missed — clean round."}
                </div>
              ) : (
                [...endItems].reverse().map((entry) => (
                  <AnswerRow key={entry.id} entry={entry} />
                ))
              )}
            </div>

            <div className="bk-divider" />
            <div className="bk-section-label">Join Today&apos;s Leaderboard</div>
            <div className="bk-join-row">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Your name"
                maxLength={18}
              />
              <button type="button" onClick={handleJoin} disabled={joining}>
                {joining ? "…" : "Join"}
              </button>
            </div>
            {lbLoading ? (
              <div className="bk-empty-note">Loading leaderboard…</div>
            ) : leaderboard.length === 0 ? (
              <div className="bk-empty-note">
                No scores yet today — be the first.
              </div>
            ) : (
              leaderboard.slice(0, 10).map((row, i) => (
                <div
                  key={row.id}
                  className={`bk-lb-row${row.id === submittedEntryIdRef.current ? " me" : ""}`}
                >
                  <div className="bk-lb-rank">{i + 1}</div>
                  <div className="bk-lb-name">{row.name}</div>
                  <div className="bk-lb-score">{row.score}</div>
                </div>
              ))
            )}

            <div className="bk-divider" />
            <div className="bk-section-label">Share Your Score</div>
            <div className="bk-share-grid">
              <button
                type="button"
                className="bk-share-btn"
                onClick={() => {
                  window.open(
                    `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
                    "_blank",
                  );
                }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path
                    fill="currentColor"
                    d="M18.9 2h3.3l-7.2 8.2L23.5 22h-6.6l-5.2-6.8L5.7 22H2.4l7.7-8.8L1.5 2h6.8l4.7 6.2L18.9 2zm-1.2 18h1.8L7.4 3.9H5.5L17.7 20z"
                  />
                </svg>
                <span>X</span>
              </button>
              <button
                type="button"
                className="bk-share-btn"
                onClick={() => {
                  void copyShareText("Instagram");
                  window.open("https://www.instagram.com/", "_blank");
                }}
              >
                <span>Instagram</span>
              </button>
              <button
                type="button"
                className="bk-share-btn"
                onClick={() => {
                  void copyShareText("TikTok");
                  window.open("https://www.tiktok.com/upload", "_blank");
                }}
              >
                <span>TikTok</span>
              </button>
              <button
                type="button"
                className="bk-share-btn"
                onClick={() => {
                  window.location.href = `sms:?&body=${encodeURIComponent(shareText)}`;
                }}
              >
                <span>Messages</span>
              </button>
            </div>
            <button
              type="button"
              className="bk-btn-ghost"
              onClick={() => setScreen("start")}
            >
              Back to Start
            </button>

            <div className="bk-streak-line">
              <WinStreakLine gameId="ball-knowledge" />
            </div>
            {countdown ? (
              <p
                style={{
                  textAlign: "center",
                  fontSize: "11px",
                  color: "var(--bk-chalk-dim)",
                  marginTop: "8px",
                }}
              >
                Next category in {countdown}
              </p>
            ) : null}
            <OtherDailies currentGameId="ball-knowledge" />
          </div>
        )}
      </div>

      {screen === "start" && showHowItWorks && (
        <GameHowItWorksModal
          subtitle="60 seconds · One category a day"
          rules={BALL_KNOWLEDGE_HOW_IT_WORKS}
          buttonLabel="Start Challenge"
          onDismiss={() => {
            markHowItWorksSeen("ball-knowledge");
            setShowHowItWorks(false);
          }}
          theme={{
            overlay: "rgba(8, 12, 20, 0.92)",
            surface: "var(--bk-backboard)",
            border: "var(--bk-line)",
            accent: "#5b9ee8",
            text: "var(--bk-chalk)",
            textMuted: "var(--bk-chalk-dim)",
          }}
        />
      )}

      <div className={`bk-toast${showToast ? " show" : ""}`}>{toastMsg}</div>
    </main>
  );
}

const BALL_KNOWLEDGE_HOW_IT_WORKS = [
  {
    title: "One Category, 60 Seconds",
    body: "Everyone gets the same category today — pizza toppings, dog breeds, state capitals, and more. Name as many valid answers as you can before time runs out.",
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
    body: "Play once, post your score to the leaderboard, then come back tomorrow for a new category.",
  },
] as const;
