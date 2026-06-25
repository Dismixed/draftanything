"use client";

import { recordDailyCompletion } from "@/lib/streak/storage";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  MIN_SCORE,
  REVEAL_PENALTY,
  STARTING_SCORE,
  STORAGE_VERSION,
  WRONG_GUESS_PENALTY,
  type AnswerType,
  type ClientClue,
  type ClientPuzzle,
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
  clues: ClientClue[];
  totalClues: number;
  revealedCount: number;
  guesses: string[];
  score: number;
  status: "playing" | "won" | "surrendered";
  answer: string | undefined;
  altAnswers: string[];
  funFact: string | undefined;
  startTime: number;
}

export interface AnyGuessrStore extends PersistedData {
  loading: boolean;
  feedback:
    | { type: "correct" | "wrong" | "info"; message: string; scoreDelta?: number }
    | null;

  initPuzzle: (mode: GameMode) => Promise<void>;
  startPuzzleFromApi: (puzzle: ClientPuzzle, mode: GameMode) => void;
  revealNextClue: () => void;
  submitGuess: (guess: string) => Promise<void>;
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

function buildInitialState(): PersistedData {
  return {
    mode: "daily",
    puzzleId: null,
    date: "",
    answerType: "country",
    region: undefined,
    flagUrl: undefined,
    clues: [],
    totalClues: 0,
    revealedCount: 0,
    guesses: [],
    score: STARTING_SCORE,
    status: "playing",
    answer: undefined,
    altAnswers: [],
    funFact: undefined,
    startTime: 0,
  };
}

function buildStateFromPuzzle(puzzle: ClientPuzzle, mode: GameMode): PersistedData {
  return {
    ...buildInitialState(),
    mode,
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

async function fetchDailyPuzzle(): Promise<ClientPuzzle> {
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

/**
 * Persisted "recently played puzzle ids" used by infinite mode to spread plays
 * across the set instead of repeat-surfacing the same country. Lives in
 * localStorage so SSR can't read it; the helpers guard for that.
 */
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

export const useAnyGuessrStore = create<AnyGuessrStore>()(
  persist(
    (set, get) => ({
      ...buildInitialState(),
      loading: false,
      feedback: null,

      startPuzzleFromApi: (puzzle, mode) => {
        set({
          ...buildStateFromPuzzle(puzzle, mode),
          feedback: null,
          loading: false,
        });
        pushRecent(puzzle.id);
      },

      initPuzzle: async (mode: GameMode) => {
        const s = get();
        // Same-day daily puzzle already in progress → don't refetch.
        if (mode === "daily" && s.puzzleId && isToday(s.date)) {
          return;
        }
        try {
          set({ loading: true });
          const puzzle =
            mode === "daily"
              ? await fetchDailyPuzzle()
              : await fetchInfinitePuzzle(getRecent());
          set({
            ...buildStateFromPuzzle(puzzle, mode),
            feedback: null,
            loading: false,
          });
          pushRecent(puzzle.id);
        } catch (err) {
          console.error("anyguessr init failed:", err);
          set({
            ...buildInitialState(),
            mode,
            loading: false,
            feedback: { type: "info", message: "Couldn't load a puzzle. Try again." },
          });
        }
      },

      revealNextClue: () => {
        const s = get();
        if (s.status !== "playing") return;
        if (s.revealedCount >= s.totalClues) return;
        set({
          revealedCount: s.revealedCount + 1,
          score: applyPenalty(s.score, REVEAL_PENALTY),
          feedback: { type: "info", message: `Clue revealed · −${REVEAL_PENALTY}`, scoreDelta: -REVEAL_PENALTY },
        });
      },

      submitGuess: async (guess: string) => {
        const s = get();
        if (s.status !== "playing" || !s.puzzleId) return;
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
          void postAttempt(s, "won");
          return;
        }

        // Wrong guess → penalty, auto-reveal next clue if any unrevealed remain.
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

      surrender: async () => {
        const s = get();
        if (s.status !== "playing" || !s.puzzleId) return;
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
        void postAttempt(s, "surrendered");
      },

      nextRound: async () => {
        const s = get();
        const mode = s.mode;
        set({ ...buildInitialState(), mode, loading: true });
        try {
          const puzzle =
            mode === "daily"
              ? await fetchDailyPuzzle()
              : await fetchInfinitePuzzle(getRecent());
          set({
            ...buildStateFromPuzzle(puzzle, mode),
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
        clues: s.clues,
        totalClues: s.totalClues,
        revealedCount: s.revealedCount,
        guesses: s.guesses,
        score: s.score,
        status: s.status,
        answer: s.answer,
        altAnswers: s.altAnswers,
        funFact: s.funFact,
        startTime: s.startTime,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as PersistedData),
      }),
    },
  ),
);

function postAttempt(state: PersistedData, outcome: "won" | "surrendered"): void {
  if (!state.puzzleId) return;
  const completed = outcome === "won";
  const correct = outcome === "won";
  if (state.mode === "daily" && completed) {
    recordDailyCompletion("anyguessr", state.date);
  }
  void fetch("/api/anyguessr/attempt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      puzzleId: state.puzzleId,
      mode: state.mode,
      completed,
      surrendered: !completed,
      correct,
      score: state.score,
      guesses: state.guesses.length,
      cluesRevealed: state.revealedCount,
    }),
  }).catch(() => {});
}