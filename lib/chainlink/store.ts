"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Puzzle, WordStatus, GameMode } from "./types";
import { getDailyPuzzle, getRandomPuzzle, getDateString } from "./puzzles";

/* ------------------------------------------------------------------ */
/*  Persisted slice                                                    */
/* ------------------------------------------------------------------ */

interface PersistedData {
  mode: GameMode;
  puzzle: Puzzle | null;
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
  puzzle: Puzzle | null;
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

  feedback: { type: "correct" | "incorrect" | null; message: string } | null;
  justSolvedIndex: number | null;

  initPuzzle: (mode?: GameMode) => void;
  submitGuess: (guess: string) => "correct" | "incorrect" | "already-solved";
  useHint: () => { letter: string; position: number } | null;
  clearFeedback: () => void;
  clearJustSolved: () => void;
  resetGame: () => void;
}

/* ------------------------------------------------------------------ */
/*  State factory                                                      */
/* ------------------------------------------------------------------ */

const MAX_HINTS = 3;
const HINT_PENALTY = 25;

function buildInitialState(mode: GameMode = "daily"): PersistedData {
  const puzzle = mode === "daily" ? getDailyPuzzle() : getRandomPuzzle();
  const wordStatuses: WordStatus[] = [
    "solved",
    "active",
    ...Array(3).fill("locked") as WordStatus[],
  ];
  return {
    mode,
    puzzle,
    date: getDateString(),
    currentWordIndex: 1,
    wordStatuses,
    wordAttempts: puzzle.words.map(() => []),
    revealedLetters: puzzle.words.map(() => []),
    hintsRemaining: MAX_HINTS,
    score: 0,
    gameStatus: "playing",
    startTime: Date.now(),
  };
}

function isToday(dateStr: string): boolean {
  return dateStr === getDateString();
}

/* ------------------------------------------------------------------ */
/*  Create store                                                       */
/* ------------------------------------------------------------------ */

export const useChainlinkStore = create<ChainlinkStore>()(
  persist(
    (set, get) => ({
      puzzle: null,
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

      feedback: null,
      justSolvedIndex: null,

      initPuzzle: (mode?: GameMode) => {
        const { date, mode: currentMode, puzzle } = get();
        const targetMode = mode ?? currentMode ?? "daily";

        if (targetMode === "daily") {
          if (!puzzle || !date || !isToday(date)) {
            set({ ...buildInitialState("daily"), feedback: null, justSolvedIndex: null });
          }
        } else {
          set({ ...buildInitialState("unlimited"), feedback: null, justSolvedIndex: null });
        }
      },

      submitGuess: (guess: string) => {
        const state = get();
        if (state.gameStatus !== "playing" || !state.puzzle) return "incorrect";

        const idx = state.currentWordIndex;
        const word = state.puzzle.words[idx];
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
          if (nextIndex < state.puzzle.words.length) {
            newStatuses[nextIndex] = "active";
          } else {
            newGameStatus = "completed";
          }

          set({
            wordStatuses: newStatuses,
            wordAttempts: newAttempts,
            currentWordIndex: Math.min(nextIndex, state.puzzle.words.length - 1),
            score: state.score + 100,
            gameStatus: newGameStatus,
            feedback: { type: "correct", message: "Correct! +100 pts" },
            justSolvedIndex: idx,
          });
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
              if (nextIndex < state.puzzle.words.length) {
                newStatuses[nextIndex] = "active";
              } else {
                newGameStatus = "completed";
              }

              set({
                wordAttempts: newAttempts,
                revealedLetters: newRevealed,
                wordStatuses: newStatuses,
                currentWordIndex: Math.min(nextIndex, state.puzzle.words.length - 1),
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
        if (state.gameStatus !== "playing" || !state.puzzle) return null;
        if (state.hintsRemaining <= 0) return null;

        const idx = state.currentWordIndex;
        if (state.wordStatuses[idx] !== "active") return null;

        const word = state.puzzle.words[idx];
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
          if (nextIndex < state.puzzle.words.length) {
            newStatuses[nextIndex] = "active";
          } else {
            newGameStatus = "completed";
          }
          set({
            revealedLetters: newRevealed,
            hintsRemaining: state.hintsRemaining - 1,
            score: Math.max(0, state.score + 100 - HINT_PENALTY),
            wordStatuses: newStatuses,
            currentWordIndex: Math.min(nextIndex, state.puzzle.words.length - 1),
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

      resetGame: () => {
        const { mode } = get();
        set({ ...buildInitialState(mode), feedback: null, justSolvedIndex: null });
      },
    }),
    {
      name: "chainlink-v2",
      partialize: (state): PersistedData => ({
        mode: state.mode,
        puzzle: state.puzzle,
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
