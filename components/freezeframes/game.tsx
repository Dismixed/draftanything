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
  TEXT_CLUE_MAX_PTS,
  WRONG_PEN,
  calcAvailablePoints,
  calcRoundScore,
  getCountdownText,
  getDisplayDate,
} from "@/lib/freezeframes/game-logic";
import { frostLevel } from "@/lib/freezeframes/frost";
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
import { burstFrom } from "@/lib/motion/burst";
import { impactRing } from "@/lib/motion/impact-ring";
import { triggerAnimation } from "@/lib/motion/trigger-class";
import { useCountUp } from "@/lib/motion/count-up";
import { useSound } from "@/lib/audio/sound-context";
import { GameHowItWorksModal } from "@/components/ui/game-how-it-works-modal";
import { OtherDailies } from "@/components/daily/other-dailies";
import { ShareResult } from "@/components/daily/share-result";
import { freezeFramesShare } from "@/lib/share/results";
import { getDateString as shareDate } from "@/lib/streak/date";
import { DailyCompleteShell } from "@/components/daily/daily-complete-shell";
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

/**
 * Crack lines across the frame, one added per wrong guess. Drawn in a 100 x 100 box that is
 * stretched over the frame.
 */
const CRACKS = [
  "M0 34 L22 40 L31 28 L46 47 L58 39 L71 58 L100 52",
  "M46 47 L41 70 L52 100 M58 39 L66 14 L60 0",
  "M22 40 L14 66 L0 80 M71 58 L80 82 L74 100",
  "M31 28 L24 8 L30 0 M100 22 L84 30 L71 58",
  "M0 60 L14 66 M41 70 L26 84 L28 100 M80 82 L100 76",
];

/** The day's four rounds as a strip of film: solved frames fill in with a thumbnail and points. */
function FilmStrip({
  round,
  results,
  thumbs,
}: {
  /** The round in play. -1 before the game starts, and the round count once it is over. */
  round: number;
  results: readonly RoundResult[];
  thumbs: readonly (string | undefined)[];
}) {
  return (
    <ol className="ff-strip" aria-label="Rounds">
      {ROUNDS.map((r, i) => {
        const result = results[i];
        const label = r.title.replace("Name the ", "");
        if (result && i < round) {
          return (
            <li key={r.key} className={`ff-cell is-done ${result.correct ? "is-ok" : "is-miss"}`}>
              {thumbs[i] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbs[i]} alt="" />
              )}
              <b>{result.correct ? `+${result.score}` : "0"}</b>
            </li>
          );
        }
        return (
          <li key={r.key} className={`ff-cell${i === round ? " is-now" : ""}`} aria-current={i === round ? "step" : undefined}>
            <span aria-hidden="true">{r.icon}</span>
            <em>{label}</em>
          </li>
        );
      })}
    </ol>
  );
}

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
  textClue,
  onRequestClue,
}: {
  data: SongRound;
  playing: boolean;
  songPos: number;
  onToggle: () => void;
  /** The written clue, once the player has asked for it. */
  textClue: string | null;
  onRequestClue: () => void;
}) {
  const pct = Math.min(songPos / SNIPPET_SEC, 1);
  const elapsed = Math.min(songPos, SNIPPET_SEC);

  if (textClue) {
    return (
      <div className="freezeframes-song-player">
        <div className="freezeframes-song-artist">
          by <strong>{data.artist}</strong>
        </div>
        <p className="freezeframes-text-clue">{textClue}</p>
        <div className="freezeframes-snippet-tag">◆ Written clue · max {TEXT_CLUE_MAX_PTS} pts</div>
      </div>
    );
  }

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
      {data.hasTextClue && (
        <button type="button" className="freezeframes-no-audio-btn" onClick={onRequestClue}>
          Can&apos;t listen? Get a written clue (max {TEXT_CLUE_MAX_PTS} pts)
        </button>
      )}
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
  const [completeOpen, setCompleteOpen] = useState(false);

  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const guessesRef = useRef<GuessHistoryRow[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gameWrapRef = useRef<HTMLDivElement>(null);
  const resultCardRef = useRef<HTMLDivElement>(null);
  const songIvRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [songPlaying, setSongPlaying] = useState(false);
  const [songPos, setSongPos] = useState(0);
  const songPosRef = useRef(0);
  // Set when the player swaps the song clip for a written clue; caps the round's score.
  const [textClue, setTextClue] = useState<string | null>(null);
  const maxPtsRef = useRef(MAX_PTS);
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
      setTextClue(null);
      maxPtsRef.current = MAX_PTS;
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
          calcAvailablePoints(guessesRef.current, startTimeRef.current, Date.now(), maxPtsRef.current),
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
    setAvailablePts(calcAvailablePoints(guesses, startTimeRef.current, Date.now(), maxPtsRef.current));
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

  const requestTextClue = useCallback(async () => {
    try {
      const res = await fetch("/api/freezeframes/daily/clue");
      if (!res.ok) throw new Error("clue failed");
      const data = (await res.json()) as { clue: string };
      pauseSong();
      maxPtsRef.current = TEXT_CLUE_MAX_PTS;
      setTextClue(data.clue);
      setAvailablePts(
        calcAvailablePoints(guessesRef.current, startTimeRef.current, Date.now(), TEXT_CLUE_MAX_PTS),
      );
    } catch {
      setFetchError("Could not load the written clue — try again.");
    }
  }, [pauseSong]);

  const completeRound = useCallback(
    (correct: boolean, answer: string) => {
      clearRoundTimer();
      pauseSong();
      const score = calcRoundScore(
        correct,
        guesses,
        startTimeRef.current,
        Date.now(),
        maxPtsRef.current,
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

  const lastResult = roundResults[roundResults.length - 1];
  useEffect(() => {
    if (!roundComplete || !lastResult?.correct) return;
    const level = lastResult.score >= 800 ? 2 : lastResult.score >= 500 ? 1 : 0;
    impactRing(resultCardRef.current, "var(--ff-green)");
    void burstFrom(resultCardRef.current, level, "purple");
  }, [roundComplete, lastResult]);

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
        triggerAnimation(gameWrapRef.current, "anim-screen-shake", 250);
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

  const displayTotal = useCountUp(finishResultsTotal, screen === "results", 900);

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
        textClue={textClue}
        onRequestClue={() => void requestTextClue()}
      />
    );
  };

  const currentResult = roundResults[round];
  // The finish screens are drawn in a full-screen overlay that has its own Home and close.
  const overlayOpen = (screen === "played" || screen === "results") && completeOpen;
  // What each round showed, for the film strip. Song rounds have no picture.
  const thumbs = ROUNDS.map((r) => (puzzle?.rounds[r.key] as { img?: string } | undefined)?.img);
  const wrongCount = guesses.filter((g) => !g.correct && !g.skip).length;
  const elapsedSec = ((Date.now() - startTimeRef.current) / 1000).toFixed(1);

  useEffect(() => {
    if (screen !== "played" && screen !== "results") {
      setCompleteOpen(false);
      return;
    }
    const timer = setTimeout(() => setCompleteOpen(true), 350);
    return () => clearTimeout(timer);
  }, [screen]);

  return (
    <DailyCompleteShell
      enabled={screen === "played" || screen === "results"}
      open={completeOpen}
      onClose={() => setCompleteOpen(false)}
      ariaLabel="Daily complete"
    >
    <div className={`freezeframes-app${overlayOpen ? " is-overlay" : ""}`}>
      <header className="ff-head">
        <Link href="/" className="ff-back">
          &larr; Back
        </Link>
        <Link href="/freezeframes" className="ff-title">
          Freeze<span className="hl">Frames</span>
        </Link>
        <div className="ff-head-right">
          {screen === "game" ? (
            <>
              <span className="ff-stat">
                Round<b>{round + 1}</b>/ {ROUNDS.length}
              </span>
              <span className="ff-stat">
                Score<b>{totalScore}</b>
              </span>
            </>
          ) : (
            <Link href="/freezeframes/leaderboard" className="ff-link">
              Leaderboard
            </Link>
          )}
        </div>
      </header>

      {fetchError && <p className="ff-error">{fetchError}</p>}

      <div className={`freezeframes-screen ff-home${screen === "home" ? " active" : ""}`}>
        <WinStreakLine gameId="freezeframes" accentColor="var(--ff-purple-light)" />
        <p className="ff-eyebrow">Daily challenge · {displayDate}</p>
        <h1 className="freezeframes-home-logo">
          Freeze<span className="hl">Frames</span>
        </h1>
        <p className="ff-home-sub">
          Four rounds. Four frames. One shot a day.
          <br />
          Answer before the frame freezes over.
        </p>
        <FilmStrip round={-1} results={[]} thumbs={[]} />
        <button type="button" className="ff-cta ff-cta-wide" onClick={() => void tryPlay()}>
          Play today&apos;s FreezeFrames
        </button>
      </div>

      <div className={`freezeframes-screen ff-final${screen === "played" ? " active" : ""}`}>
        <p className="ff-eyebrow">Today&apos;s score</p>
        <div className="ff-total">
          {playedScore}
          <span>/ {playedMax}</span>
        </div>
        <div className="ff-tiles">
          <div>
            <b>{countdown}</b>
            <span>Next FreezeFrames</span>
          </div>
        </div>
        <div className="ff-actions">
          <WinStreakLine gameId="freezeframes" accentColor="var(--ff-purple-light)" />
          <ShareResult gameId="freezeframes" text={freezeFramesShare(null, playedScore ?? 0, shareDate())} />
        </div>
        <div className="ff-links">
          <Link href="/freezeframes/leaderboard" className="ff-btn">
            Leaderboard
          </Link>
        </div>
        <OtherDailies currentGameId="freezeframes" />
      </div>

      <div className={`freezeframes-screen freezeframes-game-screen${screen === "game" ? " active" : ""}`}>
        <FilmStrip round={round} results={roundResults} thumbs={thumbs} />

        <div ref={gameWrapRef} className="ff-play">
          <div className="ff-round-row">
            <span className="ff-chip">
              <b>Round {round + 1}</b>
              {cfg?.title}
            </span>
            {!roundComplete && (
              <span className="ff-pts" aria-label={`${availablePts} points left`}>
                <span aria-hidden="true">❄</span>
                {availablePts}
              </span>
            )}
          </div>

          {/* The frame freezes over as the points drain. Each wrong guess leaves a crack. */}
          <div
            className={[
              "ff-stage",
              `is-${cfg?.mediaType ?? "image"}`,
              roundComplete ? (currentResult?.correct ? "is-shattered" : "is-melted") : "",
            ].filter(Boolean).join(" ")}
            style={{ "--f": frostLevel(availablePts) } as React.CSSProperties}
          >
            {renderMedia()}
            <div className="ff-frost" aria-hidden="true" />
            <svg className="ff-cracks" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {CRACKS.slice(0, wrongCount).map((d, i) => (
                <path key={i} d={d} />
              ))}
            </svg>
          </div>

          {!roundComplete && (
            <div className="ff-drain" aria-hidden="true">
              <i style={{ width: `${(availablePts / MAX_PTS) * 100}%` }} />
            </div>
          )}

          {!roundComplete ? (
            <>
              <div className="ff-guess">
                <input
                  className={`ff-input${shakeInput ? " shake" : ""}${flashInput ? " correct-flash" : ""}`}
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void submitGuess();
                  }}
                  placeholder={cfg?.guessLabel}
                  aria-label={cfg?.guessLabel}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={submitting}
                />
                <button type="button" className="ff-cta" onClick={() => void submitGuess()} disabled={submitting}>
                  Guess
                </button>
              </div>
              <div className="ff-under">
                <div className="ff-misses">
                  {guesses
                    .filter((g) => !g.correct && !g.skip)
                    .map((g, i) => (
                      <span key={i} className="ff-miss anim-pop-in">
                        {g.text}
                      </span>
                    ))}
                  {wrongCount === 0 && <span className="ff-penalty">−{WRONG_PEN} points per wrong guess</span>}
                </div>
                <button type="button" className="ff-skip" onClick={() => void skipRound()} disabled={submitting}>
                  Skip this round
                </button>
              </div>
            </>
          ) : null}

          {roundComplete && currentResult ? (
            <div
              ref={resultCardRef}
              className={`ff-result ${currentResult.correct ? "is-ok anim-pop-in" : "is-miss"}`}
            >
              <div>
                <p className="ff-result-kind">{currentResult.correct ? "Correct" : "The answer was"}</p>
                <h2 className="ff-result-answer">{currentResult.answer}</h2>
                <p className="ff-result-sub">
                  {currentResult.correct
                    ? `${wrongCount === 0 ? "First guess" : `${wrongCount} wrong guess${wrongCount !== 1 ? "es" : ""}`} · ${elapsedSec}s`
                    : "Better luck next round."}
                </p>
              </div>
              <div className="ff-result-pts">{currentResult.correct ? `+${currentResult.score}` : "+0"}</div>
            </div>
          ) : null}

          {roundComplete ? (
            <button type="button" className="ff-cta ff-cta-wide" onClick={nextRound} autoFocus>
              {round >= ROUNDS.length - 1 ? "See results" : "Next round"}
            </button>
          ) : null}
        </div>
      </div>

      <div className={`freezeframes-screen ff-final${screen === "results" ? " active" : ""}`}>
        <p className="ff-eyebrow">Daily complete · {displayDate}</p>
        <div className="ff-total">
          {displayTotal}
          <span>/ {MAX_DAILY_SCORE}</span>
        </div>

        <FilmStrip round={ROUNDS.length} results={roundResults} thumbs={thumbs} />

        <ol className="ff-breakdown">
          {ROUNDS.map((r, i) => {
            const result = roundResults[i];
            return (
              <li key={r.key} className={result?.correct ? "is-ok" : "is-miss"}>
                <span className="ff-bd-icon" aria-hidden="true">
                  {r.icon}
                </span>
                <span className="ff-bd-kind">{r.title.replace("Name the ", "")}</span>
                <span className="ff-bd-answer">{result?.answer ?? "—"}</span>
                <b>{result?.correct ? `+${result.score}` : "0"}</b>
              </li>
            );
          })}
        </ol>

        {!lbSubmitted ? (
          <div className="ff-save">
            <input
              className="ff-input"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your name"
              aria-label="Your name for the leaderboard"
              maxLength={20}
            />
            <button type="button" className="ff-btn is-accent" onClick={() => void submitToLeaderboard()} disabled={lbSubmitting}>
              {lbSubmitting ? "Saving…" : "Save score"}
            </button>
          </div>
        ) : null}

        <div className="ff-actions">
          <WinStreakLine gameId="freezeframes" accentColor="var(--ff-purple-light)" />
          <ShareResult gameId="freezeframes" text={freezeFramesShare(roundResults, totalScore, shareDate())} />
        </div>
        <div className="ff-links">
          <Link href="/freezeframes/leaderboard" className="ff-btn">
            Leaderboard
          </Link>
          <button type="button" className="ff-btn" onClick={() => setScreen("home")}>
            Home
          </button>
        </div>

        <OtherDailies currentGameId="freezeframes" />
      </div>

      {showHowItWorks && (
        <GameHowItWorksModal
          subtitle="Four rounds · One shot a day"
          rules={FREEZEFRAMES_HOW_IT_WORKS}
          onDismiss={dismissHowItWorks}
          theme={{
            overlay: "var(--ff-overlay)",
            surface: "var(--ff-surface)",
            border: "var(--ff-border)",
            accent: "var(--ff-purple-light)",
            text: "var(--ff-text)",
            textMuted: "var(--ff-muted)",
          }}
        />
      )}
    </div>
    </DailyCompleteShell>
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
