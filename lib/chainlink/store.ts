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
  themeGuessed: boolean;
  themeAttempts: string[];
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
  themeGuessed: boolean;
  themeAttempts: string[];
  score: number;
  gameStatus: "playing" | "completed";
  startTime: number;

  feedback: { type: "correct" | "incorrect" | "theme-correct" | "theme-incorrect" | null; message: string } | null;
  justSolvedIndex: number | null;

  initPuzzle: (mode?: GameMode) => void;
  submitGuess: (guess: string) => "correct" | "incorrect" | "already-solved";
  submitThemeGuess: (guess: string) => boolean;
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
  const wordStatuses: WordStatus[] = ["active", ...Array(4).fill("locked") as WordStatus[]];
  return {
    mode,
    puzzle,
    date: getDateString(),
    currentWordIndex: 0,
    wordStatuses,
    wordAttempts: puzzle.words.map(() => []),
    revealedLetters: puzzle.words.map(() => []),
    hintsRemaining: MAX_HINTS,
    themeGuessed: false,
    themeAttempts: [],
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
      currentWordIndex: 0,
      wordStatuses: [] as WordStatus[],
      wordAttempts: [] as string[][],
      revealedLetters: [] as boolean[][],
      hintsRemaining: MAX_HINTS,
      themeGuessed: false,
      themeAttempts: [],
      score: 0,
      gameStatus: "playing",
      startTime: 0,

      feedback: null,
      justSolvedIndex: null,

      initPuzzle: (mode?: GameMode) => {
        const { date, mode: currentMode } = get();
        const targetMode = mode ?? currentMode ?? "daily";

        if (targetMode === "daily") {
          if (!date || !isToday(date)) {
            set({ ...buildInitialState("daily"), feedback: null, justSolvedIndex: null });
          }
        } else {
          // Unlimited mode — always start fresh
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
          // Reveal the next unrevealed letter (sequential left-to-right, skip first)
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

            // If all letters now revealed, auto-solve
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

      submitThemeGuess: (guess: string) => {
        const state = get();
        if (!state.puzzle || state.themeGuessed) return false;

        const normalizedGuess = guess.trim().toLowerCase();
        const normalizedTheme = state.puzzle.theme.toLowerCase();
        const newThemeAttempts = [...state.themeAttempts, guess.trim()];

        const THEME_ALIASES: Record<string, string[]> = {
          animals: ["animals", "animal", "creatures", "wildlife", "fauna", "beasts"],
          countries: ["countries", "country", "nations", "nation", "lands"],
          foods: ["foods", "food", "cuisine", "dishes", "meals", "eating", "cooking"],
          space: ["space", "astronomy", "cosmos", "universe", "solar system", "outer space", "stars"],
          sports: ["sports", "sport", "athletics", "games", "athletic"],
          music: ["music", "musical", "instruments", "instrumental", "songs"],
          nature: ["nature", "natural", "outdoors", "landscape", "wilderness", "geography", "earth"],
        };

        const aliases = THEME_ALIASES[normalizedTheme] ?? [normalizedTheme];
        const isCorrect = aliases.includes(normalizedGuess);

        if (isCorrect) {
          set({
            themeGuessed: true,
            themeAttempts: newThemeAttempts,
            score: state.score + 200,
            feedback: { type: "theme-correct", message: "Theme correct! +200 pts" },
          });
        } else {
          set({
            themeAttempts: newThemeAttempts,
            feedback: { type: "theme-incorrect", message: "Not the right theme. Try again." },
          });
        }
        return isCorrect;
      },

      useHint: () => {
        const state = get();
        if (state.gameStatus !== "playing" || !state.puzzle) return null;
        if (state.hintsRemaining <= 0) return null;

        const idx = state.currentWordIndex;
        if (state.wordStatuses[idx] !== "active") return null;

        const word = state.puzzle.words[idx];
        const revealed = state.revealedLetters[idx] ?? [];

        // Find all unrevealed positions (skip index 0 — first letter already shown)
        const unrevealed: number[] = [];
        for (let i = 1; i < word.length; i++) {
          if (!revealed[i]) unrevealed.push(i);
        }
        if (unrevealed.length === 0) return null;

        // Pick the first unrevealed position (sequential left-to-right)
        const pick = unrevealed[0];

        const newRevealed = [...state.revealedLetters];
        const wordRevealed = [...revealed];
        wordRevealed[pick] = true;
        newRevealed[idx] = wordRevealed;

        // Check if all letters are now revealed — if so, auto-solve
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
      name: "chainlink-daily",
      partialize: (state): PersistedData => ({
        mode: state.mode,
        puzzle: state.puzzle,
        date: state.date,
        currentWordIndex: state.currentWordIndex,
        wordStatuses: state.wordStatuses,
        wordAttempts: state.wordAttempts,
        revealedLetters: state.revealedLetters,
        hintsRemaining: state.hintsRemaining,
        themeGuessed: state.themeGuessed,
        themeAttempts: state.themeAttempts,
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
