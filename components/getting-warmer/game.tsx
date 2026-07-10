"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { GameBackLink } from "@/components/ui/game-back-link";
import { GameHowItWorksModal } from "@/components/ui/game-how-it-works-modal";
import { isHowItWorksSeen, markHowItWorksSeen } from "@/lib/game-how-it-works";
import { getCountdownText } from "@/lib/getting-warmer/game-logic";
import {
  fetchTodayLeaderboard,
  getDailyPlayed,
  getSubmittedEntryId,
  saveDailyPlayed,
  saveLeaderboardEntry,
} from "@/lib/getting-warmer/storage";
import type { DailyPuzzleClient, LeaderboardEntry } from "@/lib/getting-warmer/types";
import { GettingWarmerResultsModal } from "./results-modal";

type Screen = "loading" | "game" | "results" | "played";

function buildShareEmojis(attempts: number, won: boolean): string {
  const used = Math.min(attempts, 6);
  let emojis = "";
  for (let i = 0; i < used; i++) {
    const isLast = i === used - 1;
    emojis += isLast ? (won ? "🔥" : "💀") : "❄️";
  }
  if (attempts > 6) emojis = `…${emojis}`;
  return emojis || "❄️";
}

export default function GettingWarmerGame() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [puzzle, setPuzzle] = useState<DailyPuzzleClient | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [clues, setClues] = useState<string[]>([]);
  const [extraClues, setExtraClues] = useState<string[]>([]);
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([]);
  const [guessHistory, setGuessHistory] = useState<string[]>([]);
  const [gaveUp, setGaveUp] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [finished, setFinished] = useState(false);
  const [won, setWon] = useState(false);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackClass, setFeedbackClass] = useState("");
  const [guessInput, setGuessInput] = useState("");
  const [shakeInput, setShakeInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [igniteIndex, setIgniteIndex] = useState<number | null>(null);
  const [loadingClue, setLoadingClue] = useState(false);
  const [prefetchedClue, setPrefetchedClue] = useState<string | null>(null);

  const [countdown, setCountdown] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [lbSubmitting, setLbSubmitting] = useState(false);
  const [lbSubmitted, setLbSubmitted] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(
    () => !isHowItWorksSeen("getting-warmer"),
  );
  const [mounted, setMounted] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const submittedEntryIdRef = useRef<string | null>(getSubmittedEntryId());
  const extraCluesRef = useRef<string[]>([]);
  const wrongGuessesRef = useRef<string[]>([]);
  const cluesRef = useRef<string[]>([]);
  const authoredCountRef = useRef(0);

  useEffect(() => {
    extraCluesRef.current = extraClues;
  }, [extraClues]);

  useEffect(() => {
    wrongGuessesRef.current = wrongGuesses;
  }, [wrongGuesses]);

  useEffect(() => {
    cluesRef.current = clues;
  }, [clues]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (screen !== "results" && screen !== "played") {
      setShowResultsModal(false);
      return;
    }
    const timer = setTimeout(() => setShowResultsModal(true), 400);
    return () => clearTimeout(timer);
  }, [screen]);

  const loadLeaderboard = useCallback(async () => {
    setLbLoading(true);
    const entries = await fetchTodayLeaderboard();
    setLeaderboard(entries);
    setLbLoading(false);
  }, []);

  const prefetchNextClue = useCallback(async () => {
    if (finished) return;
    try {
      const res = await fetch("/api/getting-warmer/daily/clue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revealedClueCount: cluesRef.current.length,
          wrongGuesses: wrongGuessesRef.current,
          extraClues: extraCluesRef.current,
        }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { nextClue: string };
      setPrefetchedClue(data.nextClue);
    } catch {
      // prefetch is best-effort
    }
  }, [finished]);

  useEffect(() => {
    async function load() {
      const played = getDailyPlayed();

      try {
        const res = await fetch("/api/getting-warmer/daily");
        if (!res.ok) throw new Error("Failed to load puzzle");
        const data = (await res.json()) as DailyPuzzleClient;
        setPuzzle(data);

        if (played) {
          setAttempts(played.attempts);
          setWon(played.won);
          setAnswer(played.answer ?? "");
          setGuessHistory(played.guesses ?? []);
          setGaveUp(played.gaveUp ?? false);
          if (getSubmittedEntryId()) {
            setLbSubmitted(true);
          }
          setScreen("played");
          loadLeaderboard();
          return;
        }

        setClues(data.initialClues);
        authoredCountRef.current = data.authoredClueCount;
        cluesRef.current = data.initialClues;
        setScreen("game");
      } catch {
        setFetchError("Couldn't load today's puzzle. Try refreshing.");
        setScreen("loading");
      }
    }
    load();
  }, [loadLeaderboard]);

  useEffect(() => {
    const tick = () => setCountdown(getCountdownText());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (screen === "game" && !finished) {
      prefetchNextClue();
    }
  }, [screen, clues.length, finished, prefetchNextClue]);

  useEffect(() => {
    if (screen === "game" && !finished) {
      const id = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(id);
    }
  }, [screen, finished]);

  const finishGame = useCallback(
    async (opts: {
      won: boolean;
      gaveUp?: boolean;
      finalAnswer: string;
      finalAttempts: number;
    }) => {
      const allGuesses = opts.won
        ? [...wrongGuessesRef.current, opts.finalAnswer.toUpperCase()]
        : [...wrongGuessesRef.current];

      setFinished(true);
      setWon(opts.won);
      setGaveUp(opts.gaveUp ?? false);
      setAnswer(opts.finalAnswer);
      setAttempts(opts.finalAttempts);
      setGuessHistory(allGuesses);
      setScreen("results");

      if (opts.won) {
        setFeedback(
          `🔥 Nailed it in ${opts.finalAttempts} ${opts.finalAttempts === 1 ? "guess" : "guesses"}`,
        );
        setFeedbackClass("win");
      } else {
        setFeedback(opts.gaveUp ? "🏳️ Gave up" : "❄️ Out of guesses");
        setFeedbackClass("lose");
      }

      saveDailyPlayed(opts.won, opts.finalAttempts, {
        answer: opts.finalAnswer,
        guesses: allGuesses,
        gaveUp: opts.gaveUp,
      });
      await loadLeaderboard();
    },
    [loadLeaderboard],
  );

  const revealNextClue = useCallback(
    (nextClue: string, newExtraClues: string[]) => {
      setExtraClues(newExtraClues);
      extraCluesRef.current = newExtraClues;
      setClues((prev) => {
        const updated = [...prev, nextClue];
        cluesRef.current = updated;
        setIgniteIndex(updated.length - 1);
        setTimeout(() => setIgniteIndex(null), 600);
        return updated;
      });
      setPrefetchedClue(null);
      setFeedback("🔥 Getting warmer — new clue unlocked");
      setFeedbackClass("warm");
    },
    [],
  );

  const submitGuess = async () => {
    const val = guessInput.trim();
    if (!val || finished || submitting) return;

    setSubmitting(true);
    setLoadingClue(true);

    try {
      const res = await fetch("/api/getting-warmer/daily/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guess: val,
          revealedClueCount: clues.length,
          wrongGuesses,
          extraClues,
        }),
      });

      if (!res.ok) {
        setShakeInput(true);
        setTimeout(() => setShakeInput(false), 350);
        return;
      }

      const data = (await res.json()) as {
        correct: boolean;
        answer?: string;
        attempts?: number;
        nextClue?: string;
        extraClues?: string[];
      };

      setAttempts(data.attempts ?? wrongGuesses.length + 1);
      setGuessInput("");

      if (data.correct && data.answer) {
        await finishGame({
          won: true,
          finalAnswer: data.answer,
          finalAttempts: data.attempts ?? 1,
        });
        return;
      }

      setWrongGuesses((prev) => [...prev, val.toUpperCase()]);
      wrongGuessesRef.current = [...wrongGuessesRef.current, val.toUpperCase()];
      setShakeInput(true);
      setTimeout(() => setShakeInput(false), 350);

      const clueText = prefetchedClue ?? data.nextClue;
      if (clueText) {
        revealNextClue(clueText, data.extraClues ?? extraClues);
      }
    } catch {
      setShakeInput(true);
      setTimeout(() => setShakeInput(false), 350);
    } finally {
      setSubmitting(false);
      setLoadingClue(false);
      if (!finished) prefetchNextClue();
      inputRef.current?.focus();
    }
  };

  const handleGiveUp = async () => {
    if (finished || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/getting-warmer/daily/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          giveUp: true,
          revealedClueCount: clues.length,
          wrongGuesses,
          extraClues,
        }),
      });

      if (!res.ok) return;
      const data = (await res.json()) as { answer: string; attempts: number };

      await finishGame({
        won: false,
        gaveUp: true,
        finalAnswer: data.answer,
        finalAttempts: data.attempts,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinLeaderboard = async () => {
    const name = nameInput.trim();
    if (!name || lbSubmitting || !won || attempts < 1) return;
    setLbSubmitting(true);
    const result = await saveLeaderboardEntry(name, attempts);
    if (result.ok) {
      submittedEntryIdRef.current = result.id ?? null;
      setLbSubmitted(true);
      await loadLeaderboard();
    }
    setLbSubmitting(false);
  };

  const shareEmojis = buildShareEmojis(attempts, won);

  if (fetchError) {
    return (
      <div className="gw-page">
        <div className="gw-app">
          <div className="gw-error">{fetchError}</div>
        </div>
      </div>
    );
  }

  if (screen === "loading" && !fetchError) {
    return (
      <div className="gw-page">
        <div className="gw-app">
          <div className="gw-loading-page">Loading today&apos;s puzzle…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="gw-page">
      <div className="gw-app">
        <header className="gw-header">
          <div className="gw-badge">
            <span className="gw-badge-dot" />
            Word Game · Solo · Daily
          </div>
          <h1 className="gw-title">
            GETTING <span className="gw-title-accent">WARMER</span>
          </h1>
          <div className="gw-sub">
            Two clues to start. Guess wrong, get one more. Unlimited guesses.
          </div>
        </header>

        {(screen === "game" || screen === "results") && puzzle && (
          <>
            <div className="gw-card">
              <div className="gw-back-link">
                <GameBackLink href="/" color="var(--gw-ink-dim)" />
              </div>
              <div className="gw-clues">
                {clues.map((clue, i) => (
                  <div
                    key={`${i}-${clue}`}
                    className={`gw-clue active${igniteIndex === i ? " ignite" : ""}`}
                  >
                    <div className="gw-clue-num">{i + 1}</div>
                    <div>{clue}</div>
                  </div>
                ))}
                {loadingClue && (
                  <div className="gw-clue active loading">
                    <div className="gw-clue-num">{clues.length + 1}</div>
                    <div className="gw-clue-loading">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                )}
              </div>

              {!finished && (
                <>
                  <div className="gw-input-row">
                    <input
                      ref={inputRef}
                      type="text"
                      className={`gw-guess-input${shakeInput ? " shake" : ""}`}
                      placeholder="Type your guess..."
                      value={guessInput}
                      onChange={(e) => setGuessInput(e.target.value)}
                      disabled={submitting}
                      autoComplete="off"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitGuess();
                      }}
                    />
                    <button
                      type="button"
                      className="gw-guess-btn"
                      onClick={submitGuess}
                      disabled={submitting || !guessInput.trim()}
                    >
                      GUESS
                    </button>
                  </div>
                  <div className="gw-secondary-row">
                    <button
                      type="button"
                      className="gw-give-up-btn"
                      onClick={handleGiveUp}
                      disabled={submitting}
                    >
                      Give up
                    </button>
                  </div>
                </>
              )}

              {feedback && (
                <div className={`gw-feedback ${feedbackClass}`}>{feedback}</div>
              )}

              {wrongGuesses.length > 0 && !finished && (
                <div className="gw-past-guesses">
                  {wrongGuesses.map((g, i) => (
                    <div key={i} className="gw-past-guess">
                      {g}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {screen === "played" && puzzle && (
          <div className="gw-card">
            <div className="gw-back-link">
              <GameBackLink href="/" color="var(--gw-ink-dim)" />
            </div>
            <div className="gw-result" style={{ marginTop: 0 }}>
              <div className="gw-sub">ALREADY PLAYED TODAY</div>
              <div className="gw-result-score">
                {won ? (
                  <>
                    <b>{attempts}</b>
                    {attempts === 1 ? " guess" : " guesses"}
                  </>
                ) : (
                  <>
                    <b>{attempts}</b>
                    {attempts === 1 ? " guess" : " guesses"} before giving up
                  </>
                )}
              </div>
              <div className="gw-share-emoji">
                {buildShareEmojis(attempts, won)}
              </div>
            </div>
          </div>
        )}

        {showHowItWorks && (
          <GameHowItWorksModal
            title="How Getting Warmer Works"
            subtitle="A daily word puzzle that never runs out of hints."
            rules={[
              {
                title: "Start warm",
                body: "You begin with two clues pointing at a secret word or phrase.",
              },
              {
                title: "Unlimited guesses",
                body: "Keep guessing as long as you need. Every wrong answer unlocks another clue.",
              },
              {
                title: "Keeps going",
                body: "When the written clues run out, fresh hints are generated for you — with letter reveals as a backup.",
              },
              {
                title: "Ranked by guesses",
                body: "The leaderboard sorts by fewest guesses. Solve it in one shot and you're at the top.",
              },
            ]}
            onDismiss={() => {
              markHowItWorksSeen("getting-warmer");
              setShowHowItWorks(false);
            }}
            theme={{
              surface: "#150e08",
              border: "rgba(255, 107, 26, 0.3)",
              accent: "#ff6b1a",
              text: "#fff3e8",
              textMuted: "#c9a893",
            }}
          />
        )}
      </div>

      {mounted &&
        showResultsModal &&
        (screen === "results" || screen === "played") &&
        createPortal(
          <div
            className="gw-results-overlay anim-fade-slide-up"
            role="dialog"
            aria-modal="true"
            aria-label="Puzzle results"
          >
            <GettingWarmerResultsModal
              won={won}
              gaveUp={gaveUp}
              answer={answer}
              attempts={attempts}
              guesses={guessHistory}
              shareEmojis={shareEmojis}
              countdown={countdown}
              alreadyPlayed={screen === "played"}
              leaderboard={leaderboard}
              lbLoading={lbLoading}
              submittedEntryId={submittedEntryIdRef.current}
              nameInput={nameInput}
              onNameInputChange={setNameInput}
              onJoinLeaderboard={handleJoinLeaderboard}
              lbSubmitting={lbSubmitting}
              lbSubmitted={lbSubmitted}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
