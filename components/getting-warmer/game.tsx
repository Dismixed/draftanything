"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import { GameHowItWorksModal } from "@/components/ui/game-how-it-works-modal";
import { DailyCompleteOverlay } from "@/components/daily/daily-complete-overlay";
import { useGameHowItWorks } from "@/lib/game-how-it-works";
import { readDailyPuzzleCache, writeDailyPuzzleCache } from "@/lib/daily-puzzle-cache";
import { getCountdownText, getDateString } from "@/lib/getting-warmer/game-logic";
import { foldClues, hiddenMisses } from "@/lib/getting-warmer/fold";
import { HEAT_LABELS, heatReading } from "@/lib/getting-warmer/heat";
import {
  fetchTodayLeaderboard,
  getDailyPlayed,
  getSubmittedEntryId,
  saveDailyPlayed,
  saveLeaderboardEntry,
} from "@/lib/getting-warmer/storage";
import type { DailyPuzzleClient, LeaderboardEntry } from "@/lib/getting-warmer/types";
import { GettingWarmerResultsModal } from "./results-modal";
import { burstFrom } from "@/lib/motion/burst";
import { impactRing } from "@/lib/motion/impact-ring";
import { triggerAnimation } from "@/lib/motion/trigger-class";

type Screen = "loading" | "game" | "results" | "played";

function readInitialGettingWarmerState(): {
  screen: Screen;
  puzzle: DailyPuzzleClient | null;
  clues: string[];
  authoredCount: number;
  played: ReturnType<typeof getDailyPlayed>;
} {
  if (typeof window === "undefined") {
    return { screen: "loading", puzzle: null, clues: [], authoredCount: 0, played: null };
  }

  const today = getDateString();
  const played = getDailyPlayed();
  const cached = readDailyPuzzleCache<DailyPuzzleClient>("getting-warmer", today);
  if (!cached) {
    return { screen: "loading", puzzle: null, clues: [], authoredCount: 0, played };
  }

  if (played) {
    return {
      screen: "played",
      puzzle: cached,
      clues: [],
      authoredCount: cached.authoredClueCount,
      played,
    };
  }

  return {
    screen: "game",
    puzzle: cached,
    clues: cached.initialClues,
    authoredCount: cached.authoredClueCount,
    played,
  };
}

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
  const initial = readInitialGettingWarmerState();
  const [screen, setScreen] = useState<Screen>(initial.screen);
  const [puzzle, setPuzzle] = useState<DailyPuzzleClient | null>(initial.puzzle);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [clues, setClues] = useState<string[]>(initial.clues);
  const [extraClues, setExtraClues] = useState<string[]>([]);
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([]);
  const [guessHistory, setGuessHistory] = useState<string[]>(
    initial.played?.guesses ?? [],
  );
  const [gaveUp, setGaveUp] = useState(initial.played?.gaveUp ?? false);
  const [attempts, setAttempts] = useState(initial.played?.attempts ?? 0);
  const [finished, setFinished] = useState(false);
  const [won, setWon] = useState(initial.played?.won ?? false);
  const [answer, setAnswer] = useState(initial.played?.answer ?? "");
  const [feedback, setFeedback] = useState("");
  const [guessInput, setGuessInput] = useState("");
  const [shakeInput, setShakeInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [igniteIndex, setIgniteIndex] = useState<number | null>(null);
  const [loadingClue, setLoadingClue] = useState(false);
  const [showAllClues, setShowAllClues] = useState(false);
  const [prefetchedClue, setPrefetchedClue] = useState<string | null>(null);

  const [countdown, setCountdown] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [lbSubmitting, setLbSubmitting] = useState(false);
  const [lbSubmitted, setLbSubmitted] = useState(
    () => initial.screen === "played" && !!getSubmittedEntryId(),
  );
  const { showHowItWorks, dismissHowItWorks } = useGameHowItWorks("getting-warmer");
  const [showResultsModal, setShowResultsModal] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const submittedEntryIdRef = useRef<string | null>(getSubmittedEntryId());
  const extraCluesRef = useRef<string[]>([]);
  const wrongGuessesRef = useRef<string[]>([]);
  const cluesRef = useRef<string[]>(initial.clues);
  const authoredCountRef = useRef(initial.authoredCount);

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
    if (initial.screen === "played") {
      void loadLeaderboard();
      return;
    }
    if (initial.screen !== "loading") return;

    const today = getDateString();
    const played = getDailyPlayed();

    function applyPuzzle(data: DailyPuzzleClient) {
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
        void loadLeaderboard();
        return;
      }

      setClues(data.initialClues);
      authoredCountRef.current = data.authoredClueCount;
      cluesRef.current = data.initialClues;
      setScreen("game");
    }

    async function load() {
      try {
        const res = await fetch("/api/getting-warmer/daily");
        if (!res.ok) throw new Error("Failed to load puzzle");
        const data = (await res.json()) as DailyPuzzleClient;
        writeDailyPuzzleCache("getting-warmer", today, data);
        applyPuzzle(data);
      } catch {
        setFetchError("Couldn't load today's puzzle. Try refreshing.");
        setScreen("loading");
      }
    }

    void load();
  }, [initial.screen, loadLeaderboard]);

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
      } else {
        setFeedback(opts.gaveUp ? "🏳️ Gave up" : "❄️ Out of guesses");
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
        const tries = data.attempts ?? 1;
        impactRing(cardRef.current, "var(--gw-orange-bright)");
        void burstFrom(cardRef.current, tries === 1 ? 3 : tries <= 3 ? 2 : tries <= 6 ? 1 : 0, "ember");
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
      triggerAnimation(cardRef.current, "anim-screen-shake", 250);
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

  const howItWorksModal = showHowItWorks ? (
    <GameHowItWorksModal
      title="How Getting Warmer Works"
      subtitle="Guess until the answer gives itself away."
      rules={[
        {
          title: "Start warm",
          body: "You begin with two clues pointing at a secret word or phrase.",
        },
        {
          title: "Unlimited guesses",
          body: "Guess as much as you need. Every miss reveals another clue.",
        },
        {
          title: "Keeps going",
          body: "If the written clues run out, you still get new hints, with letter reveals as backup.",
        },
        {
          title: "Ranked by guesses",
          body: "The leaderboard sorts by fewest guesses. Solve it in one shot and you're at the top.",
        },
      ]}
      onDismiss={dismissHowItWorks}
      theme={{
        overlay: "var(--gw-overlay)",
        surface: "var(--gw-surface)",
        border: "color-mix(in srgb, var(--gw-orange) 30%, transparent)",
        accent: "var(--gw-orange)",
        text: "var(--gw-ink)",
        textMuted: "var(--gw-ink-dim)",
      }}
    />
  ) : null;

  if (fetchError) {
    return (
      <div className="gw-page">
        {howItWorksModal}
        <div className="gw-app">
          <div className="gw-error">{fetchError}</div>
        </div>
      </div>
    );
  }

  if (screen === "loading" && !fetchError) {
    return (
      <div className="gw-page">
        {howItWorksModal}
        <div className="gw-app">
          <div className="gw-loading-page">Loading today&apos;s puzzle…</div>
        </div>
      </div>
    );
  }

  const live = screen === "game" || screen === "results";
  const authored = puzzle?.authoredClueCount ?? 0;
  const heat = heatReading(clues.length, authored, won);
  const fold = foldClues(clues.length + (loadingClue ? 1 : 0));
  const hiddenWide = showAllClues ? 0 : fold.hiddenWide;
  const hiddenNarrow = showAllClues ? 0 : fold.hiddenNarrow;
  // The newest clue is shown large. While the next one is on its way, its placeholder takes that spot.
  const hotIndex = loadingClue ? clues.length : clues.length - 1;
  const earlier = clues.slice(0, hotIndex);
  const missesHidden = hiddenMisses(wrongGuesses.length);
  // Each clue keeps its own temperature, so the list reads from cold at the top to hot at the bottom.
  const warmth = (i: number) => ({ "--gw-t": Math.min(1, i / Math.max(1, authored - 1)) }) as CSSProperties;

  return (
    <div
      className={`gw-page${live ? " is-live" : ""}`}
      style={live ? ({ "--gw-h": heat.fraction } as CSSProperties) : undefined}
    >
      {howItWorksModal}
      <div className={`gw-app${live ? " gw-app--play" : ""}`}>
        <header className="gw-bar">
          <Link href="/" className="gw-bar-back">
            &larr; Back
          </Link>
          <h1 className="gw-wordmark">
            GETTING <span>WARMER</span>
          </h1>
          {live && (
            <span className="gw-guess-no">
              {finished ? (won ? "Solved" : "Gave up") : `Guess ${wrongGuesses.length + 1}`}
            </span>
          )}
        </header>

        {live && puzzle && (
          <div ref={cardRef} className="gw-play">
            {/* One thermometer, drawn upright beside the clues on wide screens and flat above them on a phone. */}
            <div className="gw-thermo" aria-hidden="true">
              <div className="gw-thermo-glass">
                <div className="gw-tube">
                  <div className="gw-merc" />
                </div>
                <div className="gw-bulb" />
              </div>
              <ol className="gw-ticks">
                {HEAT_LABELS.map((label, i) => (
                  <li key={label} className={`${i <= heat.level ? "on" : ""}${i === heat.level ? " cur" : ""}`}>
                    {label}
                  </li>
                ))}
              </ol>
            </div>

            <div className="gw-main">
              <div className="gw-flat" aria-hidden="true">
                <div>
                  <i />
                </div>
                <p>
                  <span>Cold</span>
                  <span>Hot</span>
                </p>
              </div>

              <ol className={`gw-clues${fold.folded ? " is-folded" : ""}`}>
                {(hiddenWide > 0 || hiddenNarrow > 0) && (
                  <li className={`gw-more${hiddenWide === 0 ? " gw-hide-wide" : ""}`}>
                    <button type="button" className="gw-clue gw-clue-more" onClick={() => setShowAllClues(true)}>
                      <span className="gw-more-wide">+{hiddenWide} earlier</span>
                      <span className="gw-more-narrow">+{hiddenNarrow} earlier</span>
                    </button>
                  </li>
                )}
                {earlier.map((clue, i) => (
                  <li
                    key={`${i}-${clue}`}
                    className={`gw-clue${i >= authored ? " is-bonus" : ""}${i < hiddenWide ? " gw-hide-wide" : ""}${i < hiddenNarrow ? " gw-hide-narrow" : ""}`}
                    style={warmth(i)}
                  >
                    <span className="gw-clue-num">{i + 1}</span>
                    <span className="gw-clue-text">{clue}</span>
                  </li>
                ))}
                <li
                  key={loadingClue ? "loading" : `${hotIndex}-${clues[hotIndex]}`}
                  className={`gw-clue gw-clue-hot${hotIndex >= authored ? " is-bonus" : ""}${igniteIndex === hotIndex ? " ignite" : ""}`}
                  style={warmth(hotIndex)}
                >
                  <span className="gw-clue-num">{hotIndex + 1}</span>
                  {loadingClue ? (
                    <span className="gw-clue-loading">
                      <span />
                      <span />
                      <span />
                    </span>
                  ) : (
                    <span className="gw-clue-text">{clues[hotIndex]}</span>
                  )}
                </li>
              </ol>

              {!finished && (
                <>
                  <div className="gw-input-row">
                    <input
                      ref={inputRef}
                      type="text"
                      className={`gw-guess-input${shakeInput ? " shake" : ""}`}
                      placeholder="Type your guess..."
                      aria-label="Your guess"
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
                  <div className="gw-under">
                    <div className="gw-past-guesses" aria-label="Wrong guesses">
                      {missesHidden > 0 && (
                        <span className="gw-past-guess is-more" title={wrongGuesses.slice(0, missesHidden).join(", ")}>
                          +{missesHidden}
                        </span>
                      )}
                      {wrongGuesses.slice(missesHidden).map((g, i) => (
                        <span key={missesHidden + i} className="gw-past-guess anim-pop-in">
                          {g}
                        </span>
                      ))}
                    </div>
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

              {finished && (
                <div className={`gw-outcome anim-pop-in ${won ? "is-win" : "is-lose"}`}>
                  <b>{answer}</b>
                  <span>{feedback}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {screen === "played" && puzzle && (
          <div className="gw-card">
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

      </div>

      <DailyCompleteOverlay
        open={
          showResultsModal && (screen === "results" || screen === "played")
        }
        onClose={() => setShowResultsModal(false)}
        ariaLabel="Puzzle results"
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
      </DailyCompleteOverlay>
    </div>
  );
}
