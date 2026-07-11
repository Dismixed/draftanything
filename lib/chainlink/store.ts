"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WordStatus, GameMode, GameStatus } from "./types";
import { getDateString } from "./puzzles";
import { readDailyPuzzleCache, writeDailyPuzzleCache } from "@/lib/daily-puzzle-cache";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MAX_MISTAKES = 4;

function revealNextLetter(
  word: string,
  revealed: boolean[],
): { position: number; letter: string; newRevealed: boolean[] } | null {
  const unrevealed: number[] = [];
  for (let i = 1; i < word.length; i++) {
    if (!revealed[i]) unrevealed.push(i);
  }
  if (unrevealed.length === 0) return null;

  const pick = unrevealed[0];
  const wordRevealed = [...revealed];
  wordRevealed[pick] = true;
  return { position: pick, letter: word[pick], newRevealed: wordRevealed };
}

function isWordFullyRevealed(word: string, revealed: boolean[]): boolean {
  for (let i = 1; i < word.length; i++) {
    if (!revealed[i]) return false;
  }
  return true;
}

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
  loadError: string | null;

  feedback: { type: FeedbackType; message: string } | null;
  justSolvedIndex: number | null;

  initPuzzle: (mode?: GameMode) => Promise<void>;
  submitGuess: (guess: string) => Promise<"correct" | "incorrect" | "already-solved">;
  useHint: () => { letter: string; position: number; solved: boolean } | null;
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
    hintsRemaining: MAX_MISTAKES,
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
    hintsRemaining: puzzle.maxHints ?? MAX_MISTAKES,
    gameStatus: "playing",
    startTime: Date.now(),
  };
}

function isToday(dateStr: string): boolean {
  return dateStr === getDateString();
}

function isResumableDailyState(s: PersistedData): boolean {
  return (
    s.mode === "daily" &&
    !!s.puzzleId &&
    isToday(s.date) &&
    s.puzzleWords.length > 0 &&
    (s.gameStatus === "playing" || s.gameStatus === "completed" || s.gameStatus === "failed")
  );
}

/* ------------------------------------------------------------------ */
/*  API helpers                                                        */
/* ------------------------------------------------------------------ */

async function fetchDailyPuzzle(): Promise<ApiPlayablePuzzle> {
  const today = getDateString();
  const cached = readDailyPuzzleCache<ApiPlayablePuzzle>("chainlink", today);
  if (cached) return cached;

  const res = await fetch("/api/chain/daily");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to fetch daily puzzle");
  }
  const puzzle = (await res.json()) as ApiPlayablePuzzle;
  writeDailyPuzzleCache("chainlink", today, puzzle);
  return puzzle;
}

/* ------------------------------------------------------------------ */
/*  Create store                                                       */
/* ------------------------------------------------------------------ */

export const useChainlinkStore = create<ChainlinkStore>()(
  persist(
    (set, get) => {
      const markWordSolved = (idx: number, attempts: string[][], guess: string) => {
        const state = get();
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
          wordAttempts: attempts,
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
      };

      return {
      puzzleId: null,
      puzzleWords: [],
      mode: "daily" as GameMode,
      date: "",
      currentWordIndex: 1,
      wordStatuses: [] as WordStatus[],
      wordAttempts: [] as string[][],
      revealedLetters: [] as boolean[][],
      hintsRemaining: MAX_MISTAKES,
      gameStatus: "playing",
      startTime: 0,
      loading: false,
      loadError: null,

      feedback: null,
      justSolvedIndex: null,

      initPuzzle: async (_mode?: GameMode) => {
        const state = get();
        if (isResumableDailyState(state)) {
          set({ loadError: null });
          return;
        }
        try {
          set({ loading: true, loadError: null });
          const puzzle = await fetchDailyPuzzle();
          set({ ...buildStateFromPuzzle(puzzle, "daily"), feedback: null, justSolvedIndex: null, loading: false, loadError: null });
        } catch (err) {
          console.error("Failed to init puzzle:", err);
          const message =
            err instanceof Error && err.message.includes("No puzzle")
              ? "No puzzle scheduled for today."
              : "Couldn't load today's puzzle. Check your connection and try again.";
          set({ loading: false, loadError: message });
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
          markWordSolved(idx, newAttempts, guess.trim());
          return "correct";
        }

        const newMistakesRemaining = state.hintsRemaining - 1;
        const revealed = state.revealedLetters[idx] ?? [];
        const reveal = revealNextLetter(word, revealed);

        const newRevealed = [...state.revealedLetters];
        if (reveal) {
          newRevealed[idx] = reveal.newRevealed;
        }

        if (reveal && isWordFullyRevealed(word, reveal.newRevealed)) {
          set({
            wordAttempts: newAttempts,
            revealedLetters: newRevealed,
            hintsRemaining: newMistakesRemaining,
          });
          markWordSolved(idx, newAttempts, word);
          return "correct";
        }

        if (newMistakesRemaining <= 0) {
          set({
            wordAttempts: newAttempts,
            revealedLetters: newRevealed,
            hintsRemaining: 0,
            gameStatus: "failed",
            feedback: {
              type: "incorrect",
              message: reveal
                ? `Wrong guess. Letter "${reveal.letter.toLowerCase()}" revealed — game over.`
                : "Wrong a fourth time — game over.",
            },
          });
          return "incorrect";
        }

        if (reveal) {
          set({
            wordAttempts: newAttempts,
            revealedLetters: newRevealed,
            hintsRemaining: newMistakesRemaining,
            feedback: {
              type: "hint",
              message: `Wrong guess. Letter "${reveal.letter.toLowerCase()}" revealed.`,
            },
          });
        } else {
          set({
            wordAttempts: newAttempts,
            hintsRemaining: newMistakesRemaining,
            feedback: {
              type: "incorrect",
              message: `Wrong guess. ${newMistakesRemaining} ${newMistakesRemaining === 1 ? "try" : "tries"} left.`,
            },
          });
        }
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
        const reveal = revealNextLetter(word, revealed);
        if (!reveal) return null;

        const newHintsRemaining = state.hintsRemaining - 1;
        const newRevealed = [...state.revealedLetters];
        newRevealed[idx] = reveal.newRevealed;

        if (isWordFullyRevealed(word, reveal.newRevealed)) {
          set({
            revealedLetters: newRevealed,
            hintsRemaining: newHintsRemaining,
          });
          markWordSolved(idx, state.wordAttempts, word);
          return { letter: reveal.letter, position: reveal.position, solved: true };
        }

        if (newHintsRemaining <= 0) {
          set({
            revealedLetters: newRevealed,
            hintsRemaining: 0,
            gameStatus: "failed",
            feedback: {
              type: "incorrect",
              message: `Letter "${reveal.letter.toLowerCase()}" revealed — game over.`,
            },
          });
        } else {
          set({
            revealedLetters: newRevealed,
            hintsRemaining: newHintsRemaining,
            feedback: {
              type: "hint",
              message: `Hint: letter "${reveal.letter.toLowerCase()}" revealed.`,
            },
          });
        }

        return { letter: reveal.letter, position: reveal.position, solved: false };
      },

      clearFeedback: () => set({ feedback: null }),
      clearJustSolved: () => set({ justSolvedIndex: null }),

      resetGame: async () => {
        set({ ...buildInitialState(), mode: "daily", feedback: null, justSolvedIndex: null });
        const puzzle = await fetchDailyPuzzle();
        set({ ...buildStateFromPuzzle(puzzle, "daily") });
      },
    };
    },
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
