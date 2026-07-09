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
} from "@/lib/frames/game-logic";
import { ROUNDS } from "@/lib/frames/rounds";
import {
  getDailyPlayed,
  getSubmittedEntryId,
  saveDailyPlayed,
  saveLeaderboardEntry,
} from "@/lib/frames/storage";
import type {
  DailyPuzzleClient,
  GuessHistoryRow,
  SongRound,
} from "@/lib/frames/types";
import { fireConfetti } from "@/lib/motion/confetti";
import { useSound } from "@/lib/audio/sound-context";
import { SoundToggle } from "@/components/ui/sound-toggle";
import { OtherDailies } from "@/components/daily/other-dailies";
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
    <div className="frames-media-placeholder">
      <div className="frames-ph-icon">{icon}</div>
      <div className="frames-ph-label">{label}</div>
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
    <div className="frames-song-player">
      <div className="frames-song-top">
        <div className={`frames-song-disc${playing ? " playing" : ""}`}>
          🎵
          <div className="frames-disc-hole" />
        </div>
        <div>
          <div className="frames-song-artist">
            by <strong>{data.artist}</strong>
          </div>
          <div className="frames-song-sub">20-second clip — name the song</div>
        </div>
      </div>
      <div className="frames-song-controls">
        <button type="button" className="frames-play-btn" onClick={onToggle}>
          {playing ? "⏸" : "▶"}
        </button>
        <div className="frames-waveform">
          {WAVE_HEIGHTS.map((h, i) => (
            <div
              key={i}
              className={`frames-wbar${i <= Math.floor(pct * WAVE_HEIGHTS.length) ? " lit" : ""}`}
              style={{ height: `${Math.round(h * 38)}px` }}
            />
          ))}
        </div>
        <div className="frames-song-timer">
          0:{String(Math.floor(elapsed)).padStart(2, "0")}
        </div>
      </div>
      <div className="frames-progress-bg">
        <div className="frames-progress-fill" style={{ width: `${pct * 100}%` }} />
      </div>
      <div className="frames-snippet-tag">◆ {SNIPPET_SEC}s snippet</div>
    </div>
  );
}

export default function FramesGame() {
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
      const res = await fetch("/api/frames/daily");
      if (!res.ok) throw new Error("Failed to load puzzle");
      const data = (await res.json()) as DailyPuzzleClient;
      setPuzzle(data);
      setFetchError(null);
      return data;
    } catch {
      setFetchError("Could not load today's Frames. Try again in a moment.");
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
      const res = await fetch("/api/frames/daily/guess", {
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
      const res = await fetch("/api/frames/daily/guess", {
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
      router.push("/frames/leaderboard");
    }
  }, [lbSubmitting, lbSubmitted, nameInput, finishResultsTotal, router]);

  const renderMedia = () => {
    if (!puzzle || !cfg) return null;
    const data = puzzle.rounds[cfg.key];

    if (cfg.mediaType === "image") {
      const imgData = data as { img?: string };
      return (
        <div className="frames-media-card">
          {imgData.img && !imgFailed ? (
            <Image
              src={imgData.img}
              alt=""
              width={720}
              height={405}
              className="frames-media-img"
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
        <div className="frames-media-card album">
          <div className="frames-album-img-wrap">
            {albumData.img && !imgFailed ? (
              <Image
                src={albumData.img}
                alt=""
                width={320}
                height={320}
                className="frames-album-img"
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
    <div className="frames-app">
      <nav className="frames-nav">
        <Link href="/frames" className="frames-logo">
          <span className="frames-logo-f">F</span>rames
        </Link>
        <div className="frames-nav-right">
          <span className="frames-date-chip">{displayDate}</span>
          <SoundToggle />
          <button
            type="button"
            className={`frames-nav-btn${screen === "game" ? " active" : ""}`}
            onClick={() => void tryPlay()}
          >
            Play
          </button>
          <Link href="/frames/leaderboard" className="frames-nav-btn">
            Leaderboard
          </Link>
        </div>
      </nav>

      {fetchError && (
        <p style={{ textAlign: "center", color: "var(--fr-red)", padding: "1rem" }}>
          {fetchError}
        </p>
      )}

      <div className={`frames-screen${screen === "home" ? " active" : ""}`}>
        <WinStreakLine gameId="frames" />
        <p className="frames-home-eyebrow">◆ Stim Games — Daily Challenge</p>
        <h1 className="frames-home-logo">
          <span className="hl">Fra</span>mes
        </h1>
        <p className="frames-home-sub">
          Four rounds. Four frames. One shot a day.
          <br />
          Name the movie, song, show, and album artist.
        </p>
        <div className="frames-round-pills">
          <div className="frames-rpill">🎬 Movie frame</div>
          <div className="frames-rpill">🎵 Song snippet</div>
          <div className="frames-rpill">📺 TV show frame</div>
          <div className="frames-rpill">💿 Album → name the artist</div>
        </div>
        <button
          type="button"
          className="frames-btn frames-btn-purple"
          onClick={() => void tryPlay()}
        >
          Play Today&apos;s Frames →
        </button>
      </div>

      <div className={`frames-screen${screen === "played" ? " active" : ""}`}>
        <div className="frames-played-card">
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
          <div className="frames-played-lbl">Today&apos;s score</div>
          <div className="frames-played-score-big">{playedScore}</div>
          <div className="frames-played-lbl">out of {playedMax}</div>
          <div className="frames-cdown-wrap">
            <div className="frames-cdown-lbl">Next Frames in</div>
            <div className="frames-cdown-time">{countdown}</div>
          </div>
          <Link
            href="/frames/leaderboard"
            className="frames-btn frames-btn-ghost"
            style={{ width: "100%", marginTop: "1.5rem", display: "inline-flex" }}
          >
            View Leaderboard
          </Link>
        </div>
      </div>

      <div
        className={`frames-screen frames-game-screen${screen === "game" ? " active" : ""}`}
      >
        <div className="frames-game-wrap">
          <div className="frames-progress-row">
            <div className="frames-progress-steps">
              {ROUNDS.map((_, i) => (
                <div
                  key={i}
                  className={`frames-pstep${
                    i < round ? " done" : i === round ? " active" : ""
                  }`}
                />
              ))}
            </div>
            <div className="frames-progress-score">{totalScore} pts</div>
          </div>

          <div className="frames-round-header">
            <div className="frames-round-badge">Round {round + 1} of 4</div>
            <div className="frames-round-title">{cfg?.title}</div>
            <div className="frames-round-pts">
              Up to <span>{availablePts} pts</span>
            </div>
          </div>

          <div>{renderMedia()}</div>

          {!roundComplete ? (
            <div className="frames-guess-section">
              <div className="frames-guess-label-row">
                <span className="frames-guess-label">{cfg?.guessLabel}</span>
                <span className="frames-guess-penalty">
                  −{WRONG_PEN} pts per wrong guess
                </span>
              </div>
              <div className="frames-guess-row">
                <input
                  className={`frames-guess-inp${shakeInput ? " shake" : ""}${flashInput ? " correct-flash" : ""}`}
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
                  className="frames-skip-btn"
                  onClick={() => void skipRound()}
                  disabled={submitting}
                >
                  Skip
                </button>
                <button
                  type="button"
                  className="frames-btn frames-btn-purple frames-btn-sm"
                  onClick={() => void submitGuess()}
                  disabled={submitting}
                >
                  →
                </button>
              </div>
              <div className="frames-history">
                {guesses.map((g, i) => (
                  <div
                    key={i}
                    className={`frames-hist-row ${
                      g.correct ? "correct" : g.skip ? "skipped" : "wrong"
                    }`}
                  >
                    <span className="frames-hist-icon">
                      {g.correct ? "✓" : g.skip ? "—" : "✗"}
                    </span>
                    <span className="frames-hist-text">
                      {g.text || "Skipped"}
                    </span>
                    {!g.correct && !g.skip && (
                      <span className="frames-hist-pts">−{WRONG_PEN}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {roundComplete && currentResult ? (
            <div
              className={`frames-round-result show ${
                currentResult.correct ? "frames-rr-ok" : "frames-rr-skip"
              }`}
            >
              <div className="frames-rr-title">
                {currentResult.correct
                  ? `✓ Correct — ${currentResult.answer}`
                  : `The answer was ${currentResult.answer}`}
              </div>
              <div className="frames-rr-sub">
                {currentResult.correct
                  ? `${wrongCount === 0 ? "First guess" : `${wrongCount} wrong guess${wrongCount !== 1 ? "es" : ""}`} · ${elapsedSec}s`
                  : "Better luck next time."}
              </div>
              <div className="frames-rr-pts">
                {currentResult.correct
                  ? `+${currentResult.score} pts`
                  : "+0 pts"}
              </div>
            </div>
          ) : null}

          {roundComplete ? (
            <button
              type="button"
              className="frames-btn frames-btn-purple"
              style={{ width: "100%" }}
              onClick={nextRound}
            >
              {round >= 3 ? "See Results →" : "Next Round →"}
            </button>
          ) : null}
        </div>
      </div>

      <div className={`frames-screen${screen === "results" ? " active" : ""}`}>
        <div className="frames-results-logo">
          <span className="hl">Fra</span>mes
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--fr-muted)" }}>
          {displayDate}
        </div>
        <div className="frames-total-score">{finishResultsTotal}</div>
        <div className="frames-score-max">out of {MAX_DAILY_SCORE}</div>

        <div className="frames-breakdown">
          {ROUNDS.map((r, i) => {
            const result = roundResults[i];
            return (
              <div key={r.key} className="frames-bd-row">
                <div className="frames-bd-icon">{r.icon}</div>
                <div className="frames-bd-label">
                  {r.title.replace("Name the ", "")}
                </div>
                <div className="frames-bd-answer">{result?.answer ?? "—"}</div>
                <div
                  className={`frames-bd-pts ${result?.correct ? "got" : "miss"}`}
                >
                  {result?.correct ? `+${result.score}` : "−"}
                </div>
              </div>
            );
          })}
        </div>

        {!lbSubmitted ? (
          <div className="frames-name-section">
            <p style={{ fontSize: "0.82rem", color: "var(--fr-muted)" }}>
              Save your score to the leaderboard
            </p>
            <input
              className="frames-name-inp"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your name"
              maxLength={20}
            />
            <button
              type="button"
              className="frames-btn frames-btn-purple"
              onClick={() => void submitToLeaderboard()}
              disabled={lbSubmitting}
            >
              Save Score →
            </button>
          </div>
        ) : null}

        <WinStreakLine gameId="frames" accentColor="#a855f7" />

        <OtherDailies currentGameId="frames" accentColor="#a855f7" />

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
            justifyContent: "center",
            marginTop: "1rem",
          }}
        >
          <Link href="/frames/leaderboard" className="frames-btn frames-btn-ghost frames-btn-sm">
            Leaderboard
          </Link>
          <button
            type="button"
            className="frames-btn frames-btn-ghost frames-btn-sm"
            onClick={() => setScreen("home")}
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
