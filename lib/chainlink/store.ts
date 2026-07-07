"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WordStatus, GameMode, GameStatus } from "./types";
import { getDateString } from "./puzzles";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MAX_HINTS = 3;

/* ------------------------------------------------------------------ */
/*  API Puzzle type that comes from the server                        */
/* ------------------------------------------------------------------ */

interface ApiPlayablePuzzle {
  id: string;
  date?: string;
  mode: "daily" | "infinite";
  startWord: string;
  wordLengths: number[];
  firstLetters: string[];
  maxHints: number;
  difficulty: string;
  words: string[];
}

/* ------------------------------------------------------------------ */
/*  Persisted slice                                                    */
/* ------------------------------------------------------------------ */

interface PersistedData {
  mode: GameMode;
  puzzleId: string | null;
  puzzleWords: string[];
  date: string;
  currentWordIndex: number;
  wordStatuses: WordStatus[];
  wordAttempts: string[][];
  revealedLetters: boolean[][];
  hintsRemaining: number;
  gameStatus: GameStatus;
  startTime: number;
}

type FeedbackType = "correct" | "incorrect" | "hint" | null;

/* ------------------------------------------------------------------ */
/*  Store shape                                                        */
/* ------------------------------------------------------------------ */

interface ChainlinkStore {
  puzzleId: string | null;
  puzzleWords: string[];
  mode: GameMode;
  date: string;
  currentWordIndex: number;
  wordStatuses: WordStatus[];
  wordAttempts: string[][];
  revealedLetters: boolean[][];
  hintsRemaining: number;
  gameStatus: GameStatus;
  startTime: number;
  loading: boolean;

  feedback: { type: FeedbackType; message: string } | null;
  justSolvedIndex: number | null;

  initPuzzle: (mode?: GameMode) => Promise<void>;
  submitGuess: (guess: string) => Promise<"correct" | "incorrect" | "already-solved">;
  useHint: () => { letter: string; position: number } | null;
  clearFeedback: () => void;
  clearJustSolved: () => void;
  resetGame: () => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  State factory                                                      */
/* ------------------------------------------------------------------ */

function buildInitialState(): PersistedData {
  return {
    mode: "daily",
    puzzleId: null,
    puzzleWords: [],
    date: "",
    currentWordIndex: 1,
    wordStatuses: [],
    wordAttempts: [],
    revealedLetters: [],
    hintsRemaining: MAX_HINTS,
    gameStatus: "playing",
    startTime: 0,
  };
}

function buildStateFromPuzzle(puzzle: ApiPlayablePuzzle, mode: GameMode): PersistedData {
  const words = puzzle.words;
  const wordStatuses: WordStatus[] = [
    "solved",
    "active",
    ...Array(Math.max(0, words.length - 2)).fill("locked") as WordStatus[],
  ];
  return {
    mode,
    puzzleId: puzzle.id,
    puzzleWords: words,
    date: puzzle.date ?? getDateString(),
    currentWordIndex: 1,
    wordStatuses,
    wordAttempts: words.map(() => []),
    revealedLetters: words.map(() => []),
    hintsRemaining: puzzle.maxHints ?? MAX_HINTS,
    gameStatus: "playing",
    startTime: Date.now(),
  };
}

function isToday(dateStr: string): boolean {
  return dateStr === getDateString();
}

/* ------------------------------------------------------------------ */
/*  API helpers                                                        */
/* ------------------------------------------------------------------ */

async function fetchDailyPuzzle(): Promise<ApiPlayablePuzzle> {
  const res = await fetch("/api/chain/daily");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to fetch daily puzzle");
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Create store                                                       */
/* ------------------------------------------------------------------ */

export const useChainlinkStore = create<ChainlinkStore>()(
  persist(
    (set, get) => ({
      puzzleId: null,
      puzzleWords: [],
      mode: "daily" as GameMode,
      date: "",
      currentWordIndex: 1,
      wordStatuses: [] as WordStatus[],
      wordAttempts: [] as string[][],
      revealedLetters: [] as boolean[][],
      hintsRemaining: MAX_HINTS,
      gameStatus: "playing",
      startTime: 0,
      loading: false,

      feedback: null,
      justSolvedIndex: null,

      initPuzzle: async (_mode?: GameMode) => {
        const { date, puzzleId } = get();
        try {
          if (puzzleId && date && isToday(date)) {
            return;
          }
          set({ loading: true });
          const puzzle = await fetchDailyPuzzle();
          set({ ...buildStateFromPuzzle(puzzle, "daily"), feedback: null, justSolvedIndex: null, loading: false });
        } catch (err) {
          console.error("Failed to init puzzle:", err);
          set({ loading: false });
        }
      },

      submitGuess: async (guess: string) => {
        const state = get();
        if (state.gameStatus !== "playing" || !state.puzzleWords.length) return "incorrect";

        const idx = state.currentWordIndex;
        const word = state.puzzleWords[idx];
        const normalizedGuess = guess.trim().toLowerCase().replace(/\s+/g, "");
        const normalizedTarget = word.toLowerCase().replace(/\s+/g, "");

        if (state.wordStatuses[idx] === "solved") return "already-solved";

        const newAttempts = [...state.wordAttempts];
        newAttempts[idx] = [...newAttempts[idx], guess.trim()];

        if (normalizedGuess === normalizedTarget) {
          const newStatuses = [...state.wordStatuses];
          newStatuses[idx] = "solved";

          const nextIndex = idx + 1;
          let newGameStatus: GameStatus = state.gameStatus;
          if (nextIndex < state.puzzleWords.length) {
            newStatuses[nextIndex] = "active";
          } else {
            newGameStatus = "completed";
          }

          set({
            wordStatuses: newStatuses,
            wordAttempts: newAttempts,
            currentWordIndex: Math.min(nextIndex, state.puzzleWords.length - 1),
            gameStatus: newGameStatus,
            feedback: { type: "correct", message: "Correct!" },
            justSolvedIndex: idx,
          });

          if (state.puzzleId) {
            fetch("/api/chain/guess", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ puzzleId: state.puzzleId, position: idx, guess }),
            }).catch(() => {});
          }

          return "correct";
        }

        set({
          wordAttempts: newAttempts,
          feedback: {
            type: "incorrect",
            message: "Not the right word. Try again.",
          },
        });
        return "incorrect";
      },

      useHint: () => {
        const state = get();
        if (state.gameStatus !== "playing" || !state.puzzleWords.length) return null;
        if (state.hintsRemaining <= 0) return null;

        const idx = state.currentWordIndex;
        if (state.wordStatuses[idx] !== "active") return null;

        const word = state.puzzleWords[idx];
        const revealed = state.revealedLetters[idx] ?? [];

        const unrevealed: number[] = [];
        for (let i = 1; i < word.length; i++) {
          if (!revealed[i]) unrevealed.push(i);
        }
        if (unrevealed.length === 0) return null;

        const pick = unrevealed[0];
        const newHintsRemaining = state.hintsRemaining - 1;

        const newRevealed = [...state.revealedLetters];
        const wordRevealed = [...revealed];
        wordRevealed[pick] = true;
        newRevealed[idx] = wordRevealed;

        if (newHintsRemaining === 0) {
          set({
            revealedLetters: newRevealed,
            hintsRemaining: 0,
            gameStatus: "failed",
            feedback: {
              type: "incorrect",
              message: "Out of hints — game over.",
            },
          });
        } else {
          set({
            revealedLetters: newRevealed,
            hintsRemaining: newHintsRemaining,
            feedback: {
              type: "hint",
              message: `Hint: letter "${word[pick].toUpperCase()}" revealed.`,
            },
          });
        }

        return { letter: word[pick], position: pick };
      },

      clearFeedback: () => set({ feedback: null }),
      clearJustSolved: () => set({ justSolvedIndex: null }),

      resetGame: async () => {
        set({ ...buildInitialState(), mode: "daily", feedback: null, justSolvedIndex: null });
        const puzzle = await fetchDailyPuzzle();
        set({ ...buildStateFromPuzzle(puzzle, "daily") });
      },
    }),
    {
      name: "chainlink-v3",
      partialize: (state): PersistedData => ({
        mode: state.mode,
        puzzleId: state.puzzleId,
        puzzleWords: state.puzzleWords,
        date: state.date,
        currentWordIndex: state.currentWordIndex,
        wordStatuses: state.wordStatuses,
        wordAttempts: state.wordAttempts,
        revealedLetters: state.revealedLetters,
        hintsRemaining: state.hintsRemaining,
        gameStatus: state.gameStatus,
        startTime: state.startTime,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as PersistedData),
      }),
    },
  ),
);

export function isTutorialSeen(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("chainlink-tutorial-seen") === "true";
}

export function markTutorialSeen(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("chainlink-tutorial-seen", "true");
}
