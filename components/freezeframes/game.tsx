"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MAX_DAILY_SCORE,
  MAX_PTS,
  SNIPPET_SEC,
  WRONG_PEN,
  calcAvailablePoints,
  calcRoundScore,
  getCountdownText,
  getDisplayDate,
} from "@/lib/freezeframes/game-logic";
import { ROUNDS } from "@/lib/freezeframes/rounds";
import {
  getDailyPlayed,
  getSubmittedEntryId,
  saveDailyPlayed,
  saveLeaderboardEntry,
} from "@/lib/freezeframes/storage";
import type {
  DailyPuzzleClient,
  GuessHistoryRow,
  SongRound,
} from "@/lib/freezeframes/types";
import { fireConfetti } from "@/lib/motion/confetti";
import { useSound } from "@/lib/audio/sound-context";
import { SoundToggle } from "@/components/ui/sound-toggle";
import { GameHowItWorksModal } from "@/components/ui/game-how-it-works-modal";
import { OtherDailies } from "@/components/daily/other-dailies";
import { useGameHowItWorks } from "@/lib/game-how-it-works";
import { WinStreakLine } from "@/components/streak/streak-notifier";

type Screen = "home" | "played" | "game" | "results";

interface RoundResult {
  answer: string;
  score: number;
  correct: boolean;
}

const WAVE_HEIGHTS = Array.from(
  { length: 52 },
  () => Math.random() * 0.65 + 0.2,
);

function MediaPlaceholder({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="freezeframes-media-placeholder">
      <div className="freezeframes-ph-icon">{icon}</div>
      <div className="freezeframes-ph-label">{label}</div>
    </div>
  );
}

function SongPlayer({
  data,
  playing,
  songPos,
  onToggle,
}: {
  data: SongRound;
  playing: boolean;
  songPos: number;
  onToggle: () => void;
}) {
  const pct = Math.min(songPos / SNIPPET_SEC, 1);
  const elapsed = Math.min(songPos, SNIPPET_SEC);

  return (
    <div className="freezeframes-song-player">
      <div className="freezeframes-song-top">
        <div className={`freezeframes-song-disc${playing ? " playing" : ""}`}>
          🎵
          <div className="freezeframes-disc-hole" />
        </div>
        <div>
          <div className="freezeframes-song-artist">
            by <strong>{data.artist}</strong>
          </div>
          <div className="freezeframes-song-sub">20-second clip — name the song</div>
        </div>
      </div>
      <div className="freezeframes-song-controls">
        <button type="button" className="freezeframes-play-btn" onClick={onToggle}>
          {playing ? "⏸" : "▶"}
        </button>
        <div className="freezeframes-waveform">
          {WAVE_HEIGHTS.map((h, i) => (
            <div
              key={i}
              className={`freezeframes-wbar${i <= Math.floor(pct * WAVE_HEIGHTS.length) ? " lit" : ""}`}
              style={{ height: `${Math.round(h * 38)}px` }}
            />
          ))}
        </div>
        <div className="freezeframes-song-timer">
          0:{String(Math.floor(elapsed)).padStart(2, "0")}
        </div>
      </div>
      <div className="freezeframes-progress-bg">
        <div className="freezeframes-progress-fill" style={{ width: `${pct * 100}%` }} />
      </div>
      <div className="freezeframes-snippet-tag">◆ {SNIPPET_SEC}s snippet</div>
    </div>
  );
}

export default function FreezeFramesGame() {
  const router = useRouter();
  const { play: playSound } = useSound();
  const [screen, setScreen] = useState<Screen>("home");
  const [puzzle, setPuzzle] = useState<DailyPuzzleClient | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [guesses, setGuesses] = useState<GuessHistoryRow[]>([]);
  const [roundScores, setRoundScores] = useState<number[]>([]);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [roundComplete, setRoundComplete] = useState(false);
  const [guessInput, setGuessInput] = useState("");
  const [shakeInput, setShakeInput] = useState(false);
  const [flashInput, setFlashInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availablePts, setAvailablePts] = useState(MAX_PTS);
  const [countdown, setCountdown] = useState("");
  const [playedScore, setPlayedScore] = useState(0);
  const [playedMax, setPlayedMax] = useState(MAX_DAILY_SCORE);
  const [nameInput, setNameInput] = useState("");
  const [lbSubmitting, setLbSubmitting] = useState(false);
  const [lbSubmitted, setLbSubmitted] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const { showHowItWorks, dismissHowItWorks } = useGameHowItWorks("freezeframes");

  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const guessesRef = useRef<GuessHistoryRow[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const songIvRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [songPlaying, setSongPlaying] = useState(false);
  const [songPos, setSongPos] = useState(0);
  const songPosRef = useRef(0);
  const songStartedAtRef = useRef(0);

  const cfg = ROUNDS[round];
  const totalScore = roundScores.reduce((a, b) => a + b, 0);
  const displayDate = getDisplayDate();

  const clearRoundTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const pauseSong = useCallback(() => {
    setSongPlaying(false);
    if (songIvRef.current) clearInterval(songIvRef.current);
    songIvRef.current = null;
    if (audioRef.current) audioRef.current.pause();
  }, []);

  const loadPuzzle = useCallback(async () => {
    try {
      const res = await fetch("/api/freezeframes/daily");
      if (!res.ok) throw new Error("Failed to load puzzle");
      const data = (await res.json()) as DailyPuzzleClient;
      setPuzzle(data);
      setFetchError(null);
      return data;
    } catch {
      setFetchError("Could not load today's FreezeFrames. Try again in a moment.");
      return null;
    }
  }, []);

  const initRound = useCallback(
    (roundIndex: number) => {
      clearRoundTimer();
      pauseSong();
      setRound(roundIndex);
      setGuesses([]);
      guessesRef.current = [];
      setRoundComplete(false);
      setGuessInput("");
      setShakeInput(false);
      setFlashInput(false);
      setImgFailed(false);
      setAvailablePts(MAX_PTS);
      startTimeRef.current = Date.now();
      setSongPos(0);
      songPosRef.current = 0;

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }

      const roundCfg = ROUNDS[roundIndex];
      if (roundCfg.mediaType === "song" && puzzle) {
        const songData = puzzle.rounds.song as SongRound;
        if (songData.audio) {
          const audio = new Audio(songData.audio);
          audio.crossOrigin = "anonymous";
          audio.preload = "auto";
          audio.addEventListener("ended", () => pauseSong());
          audioRef.current = audio;
        }
      }

      timerRef.current = setInterval(() => {
        setAvailablePts(
          calcAvailablePoints(guessesRef.current, startTimeRef.current),
        );
      }, 300);
    },
    [clearRoundTimer, pauseSong, puzzle],
  );

  const tryPlay = useCallback(async () => {
    const played = getDailyPlayed();
    if (played) {
      setPlayedScore(played.score);
      setPlayedMax(played.max);
      setCountdown(getCountdownText());
      setScreen("played");
      return;
    }

    const data = puzzle ?? (await loadPuzzle());
    if (!data) return;

    setRoundScores([]);
    setRoundResults([]);
    setRound(0);
    setScreen("game");
  }, [puzzle, loadPuzzle]);

  useEffect(() => {
    void loadPuzzle();
    const played = getDailyPlayed();
    if (played) {
      setPlayedScore(played.score);
      setPlayedMax(played.max);
    }
    if (getSubmittedEntryId()) setLbSubmitted(true);
  }, [loadPuzzle]);

  useEffect(() => {
    if (screen !== "played") return;
    setCountdown(getCountdownText());
    const iv = setInterval(() => setCountdown(getCountdownText()), 1000);
    return () => clearInterval(iv);
  }, [screen]);

  useEffect(() => {
    if (screen !== "game" || !puzzle) return;
    initRound(round);
    return () => {
      clearRoundTimer();
      pauseSong();
    };
  }, [screen, round, puzzle, initRound, clearRoundTimer, pauseSong]);

  useEffect(() => {
    guessesRef.current = guesses;
    if (screen !== "game" || roundComplete) return;
    setAvailablePts(calcAvailablePoints(guesses, startTimeRef.current));
  }, [guesses, screen, roundComplete]);

  const playSong = useCallback(() => {
    setSongPlaying(true);
    if (audioRef.current) {
      if (songPosRef.current >= SNIPPET_SEC) {
        songPosRef.current = 0;
        setSongPos(0);
      }
      audioRef.current.currentTime = songPosRef.current;
      void audioRef.current.play().catch(() => {});
      songStartedAtRef.current = Date.now() - songPosRef.current * 1000;
    } else {
      songStartedAtRef.current = Date.now() - songPosRef.current * 1000;
    }

    if (songIvRef.current) clearInterval(songIvRef.current);
    songIvRef.current = setInterval(() => {
      const pos = audioRef.current
        ? audioRef.current.currentTime
        : (Date.now() - songStartedAtRef.current) / 1000;
      songPosRef.current = pos;
      setSongPos(pos);
      if (pos >= SNIPPET_SEC) pauseSong();
    }, 80);
  }, [pauseSong]);

  const toggleSong = useCallback(() => {
    if (songPlaying) pauseSong();
    else playSong();
  }, [songPlaying, pauseSong, playSong]);

  const completeRound = useCallback(
    (correct: boolean, answer: string) => {
      clearRoundTimer();
      pauseSong();
      const score = calcRoundScore(
        correct,
        guesses,
        startTimeRef.current,
      );
      setRoundScores((prev) => [...prev, score]);
      setRoundResults((prev) => [...prev, { answer, score, correct }]);
      setRoundComplete(true);
      if (correct) {
        playSound("correct");
        if (score >= 800) fireConfetti();
      } else {
        playSound("wrong");
      }
    },
    [clearRoundTimer, pauseSong, guesses, playSound],
  );

  const submitGuess = useCallback(async () => {
    const val = guessInput.trim();
    if (!val || submitting || roundComplete) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/freezeframes/daily/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundKey: cfg.key, guess: val }),
      });
      if (!res.ok) throw new Error("guess failed");
      const data = (await res.json()) as { correct: boolean; answer?: string };

      const row: GuessHistoryRow = { text: val, correct: data.correct };
      setGuesses((prev) => {
        const next = [...prev, row];
        guessesRef.current = next;
        return next;
      });

      if (data.correct) {
        setFlashInput(true);
        setTimeout(() => setFlashInput(false), 600);
        completeRound(true, data.answer ?? val);
      } else {
        setShakeInput(true);
        playSound("wrong");
        setTimeout(() => setShakeInput(false), 400);
        setGuessInput("");
      }
    } catch {
      setFetchError("Guess failed — try again.");
    } finally {
      setSubmitting(false);
    }
  }, [
    guessInput,
    submitting,
    roundComplete,
    cfg.key,
    completeRound,
    playSound,
  ]);

  const skipRound = useCallback(async () => {
    if (submitting || roundComplete) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/freezeframes/daily/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundKey: cfg.key, skip: true }),
      });
      if (!res.ok) throw new Error("skip failed");
      const data = (await res.json()) as { answer: string };
      setGuesses((prev) => {
        const next = [...prev, { text: "", correct: false, skip: true }];
        guessesRef.current = next;
        return next;
      });
      completeRound(false, data.answer);
    } catch {
      setFetchError("Something went wrong — try again.");
    } finally {
      setSubmitting(false);
    }
  }, [submitting, roundComplete, cfg.key, completeRound]);

  const nextRound = useCallback(() => {
    if (round >= 3) {
      setScreen("results");
      return;
    }
    setRound((r) => r + 1);
  }, [round]);

  const finishResultsTotal = useMemo(() => {
    return roundResults.reduce((sum, r) => sum + r.score, 0);
  }, [roundResults]);

  useEffect(() => {
    if (screen === "results" && roundResults.length === 4) {
      saveDailyPlayed(finishResultsTotal, MAX_DAILY_SCORE);
    }
  }, [screen, roundResults.length, finishResultsTotal]);

  const submitToLeaderboard = useCallback(async () => {
    if (lbSubmitting || lbSubmitted) return;
    setLbSubmitting(true);
    const result = await saveLeaderboardEntry(
      nameInput.trim() || "Anonymous",
      finishResultsTotal,
    );
    setLbSubmitting(false);
    if (result.ok) {
      setLbSubmitted(true);
      router.push("/freezeframes/leaderboard");
    }
  }, [lbSubmitting, lbSubmitted, nameInput, finishResultsTotal, router]);

  const renderMedia = () => {
    if (!puzzle || !cfg) return null;
    const data = puzzle.rounds[cfg.key];

    if (cfg.mediaType === "image") {
      const imgData = data as { img?: string };
      return (
        <div className="freezeframes-media-card">
          {imgData.img && !imgFailed ? (
            <Image
              src={imgData.img}
              alt=""
              width={720}
              height={405}
              className="freezeframes-media-img"
              unoptimized
              onError={() => setImgFailed(true)}
            />
          ) : (
            <MediaPlaceholder icon={cfg.icon} label="Frame" />
          )}
        </div>
      );
    }

    if (cfg.mediaType === "album") {
      const albumData = data as { img?: string };
      return (
        <div className="freezeframes-media-card album">
          <div className="freezeframes-album-img-wrap">
            {albumData.img && !imgFailed ? (
              <Image
                src={albumData.img}
                alt=""
                width={320}
                height={320}
                className="freezeframes-album-img"
                unoptimized
                onError={() => setImgFailed(true)}
              />
            ) : (
              <MediaPlaceholder icon="💿" label="Album Cover" />
            )}
          </div>
        </div>
      );
    }

    return (
      <SongPlayer
        data={data as SongRound}
        playing={songPlaying}
        songPos={songPos}
        onToggle={toggleSong}
      />
    );
  };

  const currentResult = roundResults[round];
  const wrongCount = guesses.filter((g) => !g.correct && !g.skip).length;
  const elapsedSec = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);

  return (
    <div className="freezeframes-app">
      <nav className="freezeframes-nav">
        <Link href="/freezeframes" className="freezeframes-logo">
          Freeze<span className="hl">Frames</span>
        </Link>
        <div className="freezeframes-nav-right">
          <span className="freezeframes-date-chip">{displayDate}</span>
          <SoundToggle />
          <button
            type="button"
            className={`freezeframes-nav-btn${screen === "game" ? " active" : ""}`}
            onClick={() => void tryPlay()}
          >
            Play
          </button>
          <Link href="/freezeframes/leaderboard" className="freezeframes-nav-btn">
            Leaderboard
          </Link>
        </div>
      </nav>

      {fetchError && (
        <p style={{ textAlign: "center", color: "var(--ff-red)", padding: "1rem" }}>
          {fetchError}
        </p>
      )}

      <div className={`freezeframes-screen${screen === "home" ? " active" : ""}`}>
        <WinStreakLine gameId="freezeframes" />
        <p className="freezeframes-home-eyebrow">◆ Stim Games — Daily Challenge</p>
        <h1 className="freezeframes-home-logo">
          Freeze<span className="hl">Frames</span>
        </h1>
        <p className="freezeframes-home-sub">
          Four rounds. Four frames. One shot a day.
          <br />
          Name the movie, song, show, and album artist.
        </p>
        <div className="freezeframes-round-pills">
          <div className="freezeframes-rpill">🎬 Movie frame</div>
          <div className="freezeframes-rpill">🎵 Song snippet</div>
          <div className="freezeframes-rpill">📺 TV show frame</div>
          <div className="freezeframes-rpill">💿 Album → name the artist</div>
        </div>
        <button
          type="button"
          className="freezeframes-btn freezeframes-btn-purple"
          onClick={() => void tryPlay()}
        >
          Play Today&apos;s FreezeFrames →
        </button>
      </div>

      <div className={`freezeframes-screen${screen === "played" ? " active" : ""}`}>
        <div className="freezeframes-played-card">
          <div style={{ fontSize: "2.2rem", marginBottom: "0.75rem" }}>🔒</div>
          <div
            style={{
              fontFamily: "Space Mono, monospace",
              fontSize: "1.4rem",
              fontWeight: 700,
              marginBottom: "1rem",
            }}
          >
            Come back tomorrow
          </div>
          <div className="freezeframes-played-lbl">Today&apos;s score</div>
          <div className="freezeframes-played-score-big">{playedScore}</div>
          <div className="freezeframes-played-lbl">out of {playedMax}</div>
          <div className="freezeframes-cdown-wrap">
            <div className="freezeframes-cdown-lbl">Next FreezeFrames in</div>
            <div className="freezeframes-cdown-time">{countdown}</div>
          </div>
          <Link
            href="/freezeframes/leaderboard"
            className="freezeframes-btn freezeframes-btn-ghost"
            style={{ width: "100%", marginTop: "1.5rem", display: "inline-flex" }}
          >
            View Leaderboard
          </Link>

          <WinStreakLine gameId="freezeframes" accentColor="#a855f7" />

          <OtherDailies currentGameId="freezeframes" />
        </div>
      </div>

      <div
        className={`freezeframes-screen freezeframes-game-screen${screen === "game" ? " active" : ""}`}
      >
        <div className="freezeframes-game-wrap">
          <div className="freezeframes-progress-row">
            <div className="freezeframes-progress-steps">
              {ROUNDS.map((_, i) => (
                <div
                  key={i}
                  className={`freezeframes-pstep${
                    i < round ? " done" : i === round ? " active" : ""
                  }`}
                />
              ))}
            </div>
            <div className="freezeframes-progress-score">{totalScore} pts</div>
          </div>

          <div className="freezeframes-round-header">
            <div className="freezeframes-round-badge">Round {round + 1} of 4</div>
            <div className="freezeframes-round-title">{cfg?.title}</div>
            <div className="freezeframes-round-pts">
              Up to <span>{availablePts} pts</span>
            </div>
          </div>

          <div>{renderMedia()}</div>

          {!roundComplete ? (
            <div className="freezeframes-guess-section">
              <div className="freezeframes-guess-label-row">
                <span className="freezeframes-guess-label">{cfg?.guessLabel}</span>
                <span className="freezeframes-guess-penalty">
                  −{WRONG_PEN} pts per wrong guess
                </span>
              </div>
              <div className="freezeframes-guess-row">
                <input
                  className={`freezeframes-guess-inp${shakeInput ? " shake" : ""}${flashInput ? " correct-flash" : ""}`}
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void submitGuess();
                  }}
                  placeholder={cfg?.placeholder}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="freezeframes-skip-btn"
                  onClick={() => void skipRound()}
                  disabled={submitting}
                >
                  Skip
                </button>
                <button
                  type="button"
                  className="freezeframes-btn freezeframes-btn-purple freezeframes-btn-sm"
                  onClick={() => void submitGuess()}
                  disabled={submitting}
                >
                  →
                </button>
              </div>
              <div className="freezeframes-history">
                {guesses.map((g, i) => (
                  <div
                    key={i}
                    className={`freezeframes-hist-row ${
                      g.correct ? "correct" : g.skip ? "skipped" : "wrong"
                    }`}
                  >
                    <span className="freezeframes-hist-icon">
                      {g.correct ? "✓" : g.skip ? "—" : "✗"}
                    </span>
                    <span className="freezeframes-hist-text">
                      {g.text || "Skipped"}
                    </span>
                    {!g.correct && !g.skip && (
                      <span className="freezeframes-hist-pts">−{WRONG_PEN}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {roundComplete && currentResult ? (
            <div
              className={`freezeframes-round-result show ${
                currentResult.correct ? "freezeframes-rr-ok" : "freezeframes-rr-skip"
              }`}
            >
              <div className="freezeframes-rr-title">
                {currentResult.correct
                  ? `✓ Correct — ${currentResult.answer}`
                  : `The answer was ${currentResult.answer}`}
              </div>
              <div className="freezeframes-rr-sub">
                {currentResult.correct
                  ? `${wrongCount === 0 ? "First guess" : `${wrongCount} wrong guess${wrongCount !== 1 ? "es" : ""}`} · ${elapsedSec}s`
                  : "Better luck next time."}
              </div>
              <div className="freezeframes-rr-pts">
                {currentResult.correct
                  ? `+${currentResult.score} pts`
                  : "+0 pts"}
              </div>
            </div>
          ) : null}

          {roundComplete ? (
            <button
              type="button"
              className="freezeframes-btn freezeframes-btn-purple"
              style={{ width: "100%" }}
              onClick={nextRound}
            >
              {round >= 3 ? "See Results →" : "Next Round →"}
            </button>
          ) : null}
        </div>
      </div>

      <div className={`freezeframes-screen${screen === "results" ? " active" : ""}`}>
        <div className="freezeframes-results-logo">
          Freeze<span className="hl">Frames</span>
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--ff-muted)" }}>
          {displayDate}
        </div>
        <div className="freezeframes-total-score">{finishResultsTotal}</div>
        <div className="freezeframes-score-max">out of {MAX_DAILY_SCORE}</div>

        <div className="freezeframes-breakdown">
          {ROUNDS.map((r, i) => {
            const result = roundResults[i];
            return (
              <div key={r.key} className="freezeframes-bd-row">
                <div className="freezeframes-bd-icon">{r.icon}</div>
                <div className="freezeframes-bd-label">
                  {r.title.replace("Name the ", "")}
                </div>
                <div className="freezeframes-bd-answer">{result?.answer ?? "—"}</div>
                <div
                  className={`freezeframes-bd-pts ${result?.correct ? "got" : "miss"}`}
                >
                  {result?.correct ? `+${result.score}` : "−"}
                </div>
              </div>
            );
          })}
        </div>

        {!lbSubmitted ? (
          <div className="freezeframes-name-section">
            <p style={{ fontSize: "0.82rem", color: "var(--ff-muted)" }}>
              Save your score to the leaderboard
            </p>
            <input
              className="freezeframes-name-inp"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your name"
              maxLength={20}
            />
            <button
              type="button"
              className="freezeframes-btn freezeframes-btn-purple"
              onClick={() => void submitToLeaderboard()}
              disabled={lbSubmitting}
            >
              Save Score →
            </button>
          </div>
        ) : null}

        <WinStreakLine gameId="freezeframes" accentColor="#a855f7" />

        <OtherDailies currentGameId="freezeframes" />

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
            justifyContent: "center",
            marginTop: "1rem",
          }}
        >
          <Link href="/freezeframes/leaderboard" className="freezeframes-btn freezeframes-btn-ghost freezeframes-btn-sm">
            Leaderboard
          </Link>
          <button
            type="button"
            className="freezeframes-btn freezeframes-btn-ghost freezeframes-btn-sm"
            onClick={() => setScreen("home")}
          >
            Home
          </button>
        </div>
      </div>

      {showHowItWorks && (
        <GameHowItWorksModal
          subtitle="Four rounds · One shot a day"
          rules={FREEZEFRAMES_HOW_IT_WORKS}
          onDismiss={dismissHowItWorks}
          theme={{
            overlay: "rgba(10, 5, 20, 0.92)",
            surface: "var(--ff-surface)",
            border: "var(--ff-border)",
            accent: "#a855f7",
            text: "var(--ff-text)",
            textMuted: "var(--ff-muted)",
          }}
        />
      )}
    </div>
  );
}

const FREEZEFRAMES_HOW_IT_WORKS = [
  {
    title: "Four Pop-Culture Rounds",
    body: "Name the movie from a frame, the song from a 20-second clip, the TV show from a frame, and the artist from an album cover.",
  },
  {
    title: "Type Your Guess",
    body: "Enter titles or names in the box. Close spellings and partial matches count; you don't need to be letter-perfect.",
  },
  {
    title: "Points Tick Down",
    body: "Each wrong guess costs points, and the clock keeps draining your score. Solve faster to keep more on the board.",
  },
  {
    title: "One Run Per Day",
    body: "Everyone gets the same four rounds today. Play once. Tomorrow gets a fresh set.",
  },
] as const;
