"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WordStatus, GameMode } from "./types";
import { getDateString } from "./puzzles";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MAX_HINTS = 3;
const HINT_PENALTY = 25;

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
  score: number;
  gameStatus: "playing" | "completed";
  startTime: number;
}

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
  score: number;
  gameStatus: "playing" | "completed";
  startTime: number;
  loading: boolean;

  feedback: { type: "correct" | "incorrect" | null; message: string } | null;
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
    score: 0,
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
    score: 0,
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
      score: 0,
      gameStatus: "playing",
      startTime: 0,
      loading: false,

      feedback: null,
      justSolvedIndex: null,

      initPuzzle: async (_mode?: GameMode) => {
        const { date, puzzleId } = get();
        try {
          // Skip if we already have today's puzzle
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
          let newGameStatus: "playing" | "completed" = state.gameStatus;
          if (nextIndex < state.puzzleWords.length) {
            newStatuses[nextIndex] = "active";
          } else {
            newGameStatus = "completed";
          }

          set({
            wordStatuses: newStatuses,
            wordAttempts: newAttempts,
            currentWordIndex: Math.min(nextIndex, state.puzzleWords.length - 1),
            score: state.score + 100,
            gameStatus: newGameStatus,
            feedback: { type: "correct", message: "Correct! +100 pts" },
            justSolvedIndex: idx,
          });

          // Fire-and-forget server validation
          if (state.puzzleId) {
            fetch("/api/chain/guess", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ puzzleId: state.puzzleId, position: idx, guess }),
            }).catch(() => {});
          }

          return "correct";
        } else {
          const currentRevealed = [...(state.revealedLetters[idx] ?? [])];
          const unrevealed: number[] = [];
          for (let i = 1; i < word.length; i++) {
            if (!currentRevealed[i]) unrevealed.push(i);
          }
          let newRevealed = state.revealedLetters;
          let autoLetter: string | null = null;
          if (unrevealed.length > 0) {
            const pick = unrevealed[0];
            currentRevealed[pick] = true;
            newRevealed = [...state.revealedLetters];
            newRevealed[idx] = currentRevealed;
            autoLetter = word[pick];

            const allRevealed = word.split("").every((_, i) => i === 0 || currentRevealed[i]);
            if (allRevealed) {
              const newStatuses = [...state.wordStatuses];
              newStatuses[idx] = "solved";
              const nextIndex = idx + 1;
              let newGameStatus: "playing" | "completed" = state.gameStatus;
              if (nextIndex < state.puzzleWords.length) {
                newStatuses[nextIndex] = "active";
              } else {
                newGameStatus = "completed";
              }

              set({
                wordAttempts: newAttempts,
                revealedLetters: newRevealed,
                wordStatuses: newStatuses,
                currentWordIndex: Math.min(nextIndex, state.puzzleWords.length - 1),
                score: state.score + 100,
                gameStatus: newGameStatus,
                feedback: { type: "correct", message: "All letters revealed! Word solved. +100 pts" },
                justSolvedIndex: idx,
              });
              return "correct";
            }
          }

          set({
            wordAttempts: newAttempts,
            revealedLetters: newRevealed,
            feedback: {
              type: "incorrect" as const,
              message: autoLetter
                ? `Incorrect. Letter revealed: "${autoLetter.toUpperCase()}"`
                : "Not the right word. Try again.",
            },
          });
          return "incorrect";
        }
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

        const newRevealed = [...state.revealedLetters];
        const wordRevealed = [...revealed];
        wordRevealed[pick] = true;
        newRevealed[idx] = wordRevealed;

        const allRevealed = word.split("").every((_, i) => i === 0 || wordRevealed[i]);

        if (allRevealed) {
          const newStatuses = [...state.wordStatuses];
          newStatuses[idx] = "solved";
          const nextIndex = idx + 1;
          let newGameStatus: "playing" | "completed" = state.gameStatus;
          if (nextIndex < state.puzzleWords.length) {
            newStatuses[nextIndex] = "active";
          } else {
            newGameStatus = "completed";
          }
          set({
            revealedLetters: newRevealed,
            hintsRemaining: state.hintsRemaining - 1,
            score: Math.max(0, state.score + 100 - HINT_PENALTY),
            wordStatuses: newStatuses,
            currentWordIndex: Math.min(nextIndex, state.puzzleWords.length - 1),
            gameStatus: newGameStatus,
            feedback: { type: "correct", message: "All letters revealed! Word solved. +100 pts" },
            justSolvedIndex: idx,
          });
        } else {
          set({
            revealedLetters: newRevealed,
            hintsRemaining: state.hintsRemaining - 1,
            score: Math.max(0, state.score - HINT_PENALTY),
            feedback: {
              type: "correct",
              message: `Hint: letter "${word[pick].toUpperCase()}" revealed. -${HINT_PENALTY} pts`,
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
      name: "chainlink-v2",
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
        score: state.score,
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
