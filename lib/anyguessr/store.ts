"use client";

import { recordDailyCompletion } from "@/lib/streak/storage";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DAILY_ROUND_COUNT,
  formatDistanceKm,
} from "./daily";
import {
  MIN_SCORE,
  REVEAL_PENALTY,
  STARTING_SCORE,
  STORAGE_VERSION,
  WRONG_GUESS_PENALTY,
  type AnswerType,
  type ClientClue,
  type ClientDailyPuzzle,
  type ClientDailyRound,
  type ClientPuzzle,
  type DailyGuessResult,
  type DailyRoundResult,
  type GameMode,
  type GuessResult,
} from "./types";

const RECENTLY_PLAYED_KEY = "ag-recently-played";
const RECENT_LIMIT = 20;

interface PersistedData {
  mode: GameMode;
  puzzleId: string | null;
  date: string;
  answerType: AnswerType;
  region: string | undefined;
  flagUrl: string | undefined;
  status: "playing" | "won" | "surrendered";
  answer: string | undefined;
  funFact: string | undefined;
  startTime: number;
  // Infinite mode
  clues: ClientClue[];
  totalClues: number;
  revealedCount: number;
  guesses: string[];
  score: number;
  altAnswers: string[];
  // Daily mode
  dailyRounds: ClientDailyRound[];
  currentRound: number;
  roundResults: DailyRoundResult[];
  totalScore: number;
}

export interface AnyGuessrStore extends PersistedData {
  loading: boolean;
  feedback:
    | { type: "correct" | "wrong" | "info" | "round"; message: string; scoreDelta?: number }
    | null;

  initPuzzle: (mode: GameMode) => Promise<void>;
  startPuzzleFromApi: (puzzle: ClientPuzzle, mode: GameMode) => void;
  startDailyFromApi: (puzzle: ClientDailyPuzzle) => void;
  revealNextClue: () => void;
  submitGuess: (guess: string) => Promise<void>;
  submitDailyGuess: (guess: string) => Promise<void>;
  advanceDailyRound: () => void;
  surrender: () => Promise<void>;
  nextRound: () => Promise<void>;
  clearFeedback: () => void;
}

function getDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isToday(dateStr: string | undefined | null): boolean {
  return !!dateStr && dateStr === getDateString();
}

function buildInitialState(mode: GameMode = "daily"): PersistedData {
  return {
    mode,
    puzzleId: null,
    date: "",
    answerType: "country",
    region: undefined,
    flagUrl: undefined,
    status: "playing",
    answer: undefined,
    funFact: undefined,
    startTime: 0,
    clues: [],
    totalClues: 0,
    revealedCount: 0,
    guesses: [],
    score: STARTING_SCORE,
    altAnswers: [],
    dailyRounds: [],
    currentRound: 0,
    roundResults: [],
    totalScore: 0,
  };
}

function buildStateFromPuzzle(puzzle: ClientPuzzle, mode: "infinite"): PersistedData {
  return {
    ...buildInitialState(mode),
    puzzleId: puzzle.id,
    date: puzzle.date ?? getDateString(),
    answerType: puzzle.answer_type,
    region: puzzle.region,
    flagUrl: puzzle.flag_url,
    clues: puzzle.clues,
    totalClues: puzzle.clues.length,
    revealedCount: 1,
    startTime: Date.now(),
  };
}

function buildStateFromDailyPuzzle(puzzle: ClientDailyPuzzle): PersistedData {
  return {
    ...buildInitialState("daily"),
    puzzleId: puzzle.id,
    date: puzzle.date,
    answerType: puzzle.answer_type,
    region: puzzle.region,
    dailyRounds: puzzle.rounds,
    startTime: Date.now(),
  };
}

async function fetchDailyPuzzle(): Promise<ClientDailyPuzzle> {
  const res = await fetch("/api/anyguessr/daily");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to fetch daily puzzle");
  }
  return res.json();
}

async function fetchInfinitePuzzle(excludeIds: string[]): Promise<ClientPuzzle> {
  const qs = excludeIds.length ? `?exclude=${encodeURIComponent(excludeIds.join(","))}` : "";
  const res = await fetch(`/api/anyguessr/infinite${qs}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to fetch puzzle");
  }
  return res.json();
}

function pushRecent(puzzleId: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(RECENTLY_PLAYED_KEY);
    const arr: string[] = raw ? JSON.parse(raw) : [];
    const filtered = arr.filter((id) => id !== puzzleId);
    filtered.push(puzzleId);
    while (filtered.length > RECENT_LIMIT) filtered.shift();
    window.localStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(filtered));
  } catch {
    // ignore
  }
}

function getRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTLY_PLAYED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function applyPenalty(score: number, penalty: number): number {
  return Math.max(MIN_SCORE, score - penalty);
}

function isDailyState(s: PersistedData): boolean {
  return s.mode === "daily";
}

function isInfiniteState(s: PersistedData): boolean {
  return s.mode === "infinite";
}

export const useAnyGuessrStore = create<AnyGuessrStore>()(
  persist(
    (set, get) => ({
      ...buildInitialState(),
      loading: false,
      feedback: null,

      startPuzzleFromApi: (puzzle, mode) => {
        if (mode !== "infinite") return;
        set({
          ...buildStateFromPuzzle(puzzle, mode),
          feedback: null,
          loading: false,
        });
        pushRecent(puzzle.id);
      },

      startDailyFromApi: (puzzle) => {
        set({
          ...buildStateFromDailyPuzzle(puzzle),
          feedback: null,
          loading: false,
        });
        pushRecent(puzzle.id);
      },

      initPuzzle: async (mode: GameMode) => {
        const s = get();
        if (mode === "daily" && isDailyState(s) && s.puzzleId && isToday(s.date)) {
          return;
        }
        if (mode === "infinite" && isInfiniteState(s) && s.puzzleId && s.status === "playing") {
          return;
        }

        try {
          set({ loading: true });
          if (mode === "daily") {
            const puzzle = await fetchDailyPuzzle();
            set({
              ...buildStateFromDailyPuzzle(puzzle),
              feedback: null,
              loading: false,
            });
            pushRecent(puzzle.id);
            return;
          }

          const puzzle = await fetchInfinitePuzzle(getRecent());
          set({
            ...buildStateFromPuzzle(puzzle, "infinite"),
            feedback: null,
            loading: false,
          });
          pushRecent(puzzle.id);
        } catch (err) {
          console.error("anyguessr init failed:", err);
          set({
            ...buildInitialState(mode),
            loading: false,
            feedback: { type: "info", message: "Couldn't load a puzzle. Try again." },
          });
        }
      },

      revealNextClue: () => {
        const s = get();
        if (!isInfiniteState(s) || s.status !== "playing") return;
        if (s.revealedCount >= s.totalClues) return;
        set({
          revealedCount: s.revealedCount + 1,
          score: applyPenalty(s.score, REVEAL_PENALTY),
          feedback: {
            type: "info",
            message: `Clue revealed · −${REVEAL_PENALTY}`,
            scoreDelta: -REVEAL_PENALTY,
          },
        });
      },

      submitGuess: async (guess: string) => {
        const s = get();
        if (!isInfiniteState(s) || s.status !== "playing" || !s.puzzleId) return;
        const trimmed = guess.trim();
        if (!trimmed) return;

        const newGuesses = [...s.guesses, trimmed];

        let res: GuessResult;
        try {
          const r = await fetch("/api/anyguessr/guess", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ puzzleId: s.puzzleId, guess: trimmed }),
          });
          if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            throw new Error(err.error ?? "Failed to validate guess");
          }
          res = (await r.json()) as GuessResult;
        } catch (err) {
          console.error("anyguessr guess failed:", err);
          set({ feedback: { type: "info", message: "Couldn't validate guess. Try again." } });
          return;
        }

        if (res.correct) {
          set({
            guesses: newGuesses,
            status: "won",
            answer: res.normalizedAnswer ?? undefined,
            funFact: res.funFact ?? undefined,
            feedback: { type: "correct", message: "Correct!" },
          });
          void postInfiniteAttempt(s, "won");
          return;
        }

        const canRevealMore = s.revealedCount < s.totalClues;
        const nextRevealedCount = canRevealMore ? s.revealedCount + 1 : s.revealedCount;
        set({
          guesses: newGuesses,
          revealedCount: nextRevealedCount,
          score: applyPenalty(s.score, WRONG_GUESS_PENALTY),
          feedback: {
            type: "wrong",
            message: canRevealMore
              ? `Wrong · −${WRONG_GUESS_PENALTY} · next clue revealed`
              : `Wrong · −${WRONG_GUESS_PENALTY}`,
            scoreDelta: -WRONG_GUESS_PENALTY,
          },
        });
      },

      submitDailyGuess: async (guess: string) => {
        const s = get();
        if (!isDailyState(s) || s.status !== "playing" || !s.puzzleId) return;
        const trimmed = guess.trim();
        if (!trimmed) return;

        const round = s.dailyRounds[s.currentRound];
        if (!round) return;

        let res: DailyGuessResult;
        try {
          const r = await fetch("/api/anyguessr/daily/guess", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              puzzleId: s.puzzleId,
              guess: trimmed,
              roundIndex: s.currentRound,
            }),
          });
          if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            throw new Error(err.error ?? "Failed to validate guess");
          }
          res = (await r.json()) as DailyGuessResult;
        } catch (err) {
          console.error("anyguessr daily guess failed:", err);
          set({ feedback: { type: "info", message: "Couldn't validate guess. Try again." } });
          return;
        }

        const roundResult: DailyRoundResult = {
          roundIndex: s.currentRound,
          clueType: round.clueType,
          guess: res.guess,
          answer: res.answer,
          distanceKm: res.distanceKm,
          roundScore: res.roundScore,
          exact: res.exact,
        };

        const roundResults = [...s.roundResults, roundResult];
        const totalScore = s.totalScore + res.roundScore;
        const message = res.exact
          ? `Correct! +${res.roundScore} pts`
          : `${formatDistanceKm(res.distanceKm)} away · +${res.roundScore} pts`;

        if (res.completed) {
          set({
            roundResults,
            totalScore,
            status: "won",
            answer: res.answer,
            flagUrl: res.flagUrl ?? undefined,
            funFact: res.funFact ?? undefined,
            feedback: {
              type: res.exact ? "correct" : "round",
              message,
              scoreDelta: res.roundScore,
            },
          });
          void postDailyAttempt(s, totalScore, roundResults.length);
          return;
        }

        set({
          roundResults,
          totalScore,
          currentRound: s.currentRound + 1,
          feedback: {
            type: res.exact ? "correct" : "round",
            message,
            scoreDelta: res.roundScore,
          },
        });
      },

      advanceDailyRound: () => {
        const s = get();
        if (!isDailyState(s)) return;
        if (s.currentRound >= DAILY_ROUND_COUNT - 1) return;
        set({ currentRound: s.currentRound + 1, feedback: null });
      },

      surrender: async () => {
        const s = get();
        if (!s.puzzleId) return;

        if (isInfiniteState(s)) {
          if (s.status !== "playing") return;
          let answer: string | undefined;
          let altAnswers: string[] = [];
          let funFact: string | undefined;
          try {
            const r = await fetch("/api/anyguessr/surrender", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ puzzleId: s.puzzleId }),
            });
            if (r.ok) {
              const j = (await r.json()) as {
                answer: string;
                altAnswers: string[];
                funFact: string | null;
              };
              answer = j.answer;
              altAnswers = j.altAnswers;
              funFact = j.funFact ?? undefined;
            }
          } catch (err) {
            console.error("anyguessr surrender failed:", err);
          }
          set({
            status: "surrendered",
            score: 0,
            answer,
            altAnswers,
            funFact,
            feedback: { type: "info", message: "Round surrendered · 0 pts" },
          });
          void postInfiniteAttempt(s, "surrendered");
        }
      },

      nextRound: async () => {
        const s = get();
        if (s.mode !== "infinite") return;
        set({ ...buildInitialState("infinite"), loading: true });
        try {
          const puzzle = await fetchInfinitePuzzle(getRecent());
          set({
            ...buildStateFromPuzzle(puzzle, "infinite"),
            feedback: null,
            loading: false,
          });
          pushRecent(puzzle.id);
        } catch (err) {
          console.error("anyguessr next failed:", err);
          set({ loading: false });
        }
      },

      clearFeedback: () => set({ feedback: null }),
    }),
    {
      name: STORAGE_VERSION,
      partialize: (s): PersistedData => ({
        mode: s.mode,
        puzzleId: s.puzzleId,
        date: s.date,
        answerType: s.answerType,
        region: s.region,
        flagUrl: s.flagUrl,
        status: s.status,
        answer: s.answer,
        funFact: s.funFact,
        startTime: s.startTime,
        clues: s.clues,
        totalClues: s.totalClues,
        revealedCount: s.revealedCount,
        guesses: s.guesses,
        score: s.score,
        altAnswers: s.altAnswers,
        dailyRounds: s.dailyRounds,
        currentRound: s.currentRound,
        roundResults: s.roundResults,
        totalScore: s.totalScore,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as PersistedData),
      }),
    },
  ),
);

function postInfiniteAttempt(
  state: PersistedData,
  outcome: "won" | "surrendered",
): void {
  if (!state.puzzleId) return;
  const completed = outcome === "won";
  void fetch("/api/anyguessr/attempt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      puzzleId: state.puzzleId,
      mode: state.mode,
      completed,
      surrendered: !completed,
      correct: completed,
      score: state.score,
      guesses: state.guesses.length,
      cluesRevealed: state.revealedCount,
    }),
  }).catch(() => {});
}

function postDailyAttempt(
  state: PersistedData,
  totalScore: number,
  roundsPlayed: number,
): void {
  if (!state.puzzleId) return;
  recordDailyCompletion("anyguessr", state.date);
  void fetch("/api/anyguessr/attempt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      puzzleId: state.puzzleId,
      mode: "daily",
      completed: true,
      surrendered: false,
      correct: state.roundResults.some((r) => r.exact),
      score: totalScore,
      guesses: roundsPlayed,
      cluesRevealed: roundsPlayed,
    }),
  }).catch(() => {});
}
