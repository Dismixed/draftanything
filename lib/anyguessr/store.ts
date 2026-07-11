"use client";

import { recordDailyCompletion } from "@/lib/streak/storage";
import { readDailyPuzzleCache, writeDailyPuzzleCache } from "@/lib/daily-puzzle-cache";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DAILY_ROUND_COUNT } from "./daily";
import { isValidLatLng } from "./map-projection";
import {
  STORAGE_VERSION,
  type AnswerType,
  type ClientDailyPuzzle,
  type ClientDailyRound,
  type DailyGuessResult,
  type DailyRoundRecap,
  type DailyRoundResult,
} from "./types";

interface PersistedData {
  mode: "daily";
  puzzleId: string | null;
  date: string;
  answerType: AnswerType;
  status: "playing" | "won";
  startTime: number;
  dailyRounds: ClientDailyRound[];
  currentRound: number;
  roundResults: DailyRoundResult[];
  totalScore: number;
  roundRecap: DailyRoundRecap | null;
}

export interface AnyGuessrStore extends PersistedData {
  loading: boolean;
  feedback:
    | { type: "correct" | "wrong" | "info" | "round"; message: string; scoreDelta?: number }
    | null;

  initPuzzle: () => Promise<void>;
  startDailyFromApi: (puzzle: ClientDailyPuzzle) => void;
  submitDailyGuess: (guess: string) => Promise<void>;
  continueDailyRound: () => void;
  advanceDailyRound: () => void;
  surrender: () => Promise<void>;
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

function hasValidDailyRounds(rounds: ClientDailyRound[]): boolean {
  return (
    rounds.length === DAILY_ROUND_COUNT &&
    rounds.every((r) => typeof r.puzzleId === "string" && r.puzzleId.length > 0)
  );
}

function isResumableDailyState(s: PersistedData): boolean {
  return (
    s.mode === "daily" &&
    isToday(s.date) &&
    hasValidDailyRounds(s.dailyRounds) &&
    (s.status === "playing" || s.status === "won")
  );
}

function buildInitialState(): PersistedData {
  return {
    mode: "daily",
    puzzleId: null,
    date: "",
    answerType: "country",
    status: "playing",
    startTime: 0,
    dailyRounds: [],
    currentRound: 0,
    roundResults: [],
    totalScore: 0,
    roundRecap: null,
  };
}

function buildStateFromDailyPuzzle(puzzle: ClientDailyPuzzle): PersistedData {
  return {
    ...buildInitialState(),
    puzzleId: puzzle.id,
    date: puzzle.date,
    answerType: puzzle.answer_type,
    dailyRounds: puzzle.rounds,
    startTime: Date.now(),
  };
}

async function fetchDailyPuzzle(): Promise<ClientDailyPuzzle> {
  const today = getDateString();
  const cached = readDailyPuzzleCache<ClientDailyPuzzle>("anyguessr", today);
  if (cached) return cached;

  const res = await fetch("/api/anyguessr/daily");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? (res.status === 404 ? "No puzzle available" : "Failed to fetch daily puzzle"));
  }
  const puzzle = (await res.json()) as ClientDailyPuzzle;
  writeDailyPuzzleCache("anyguessr", today, puzzle);
  return puzzle;
}

function isDailyState(s: PersistedData): boolean {
  return s.mode === "daily";
}

export const useAnyGuessrStore = create<AnyGuessrStore>()(
  persist(
    (set, get) => ({
      ...buildInitialState(),
      loading: false,
      feedback: null,

      startDailyFromApi: (puzzle) => {
        set({
          ...buildStateFromDailyPuzzle(puzzle),
          feedback: null,
          loading: false,
        });
      },

      initPuzzle: async () => {
        const s = get();
        if (isResumableDailyState(s)) {
          return;
        }

        try {
          set({ loading: true });
          const puzzle = await fetchDailyPuzzle();
          set({
            ...buildStateFromDailyPuzzle(puzzle),
            feedback: null,
            loading: false,
          });
        } catch (err) {
          console.error("anyguessr init failed:", err);
          const message =
            err instanceof Error && err.message === "No puzzle available"
              ? "Today's daily isn't ready yet — the puzzle pool can't fill all ten rounds yet."
              : "Couldn't load a puzzle. Try again.";
          set({
            ...buildInitialState(),
            loading: false,
            feedback: { type: "info", message },
          });
        }
      },

      submitDailyGuess: async (guess: string) => {
        const s = get();
        if (!isDailyState(s) || s.status !== "playing") return;
        const trimmed = guess.trim();
        if (!trimmed) return;

        const round = s.dailyRounds[s.currentRound];
        if (!round?.puzzleId) {
          set({
            feedback: {
              type: "info",
              message: "Refreshing today's puzzle…",
            },
          });
          await get().initPuzzle();
          const refreshed = get().dailyRounds[get().currentRound];
          if (!refreshed?.puzzleId) {
            set({ feedback: { type: "info", message: "Couldn't load a puzzle. Try again." } });
            return;
          }
        }

        const activeRound = get().dailyRounds[get().currentRound];
        if (!activeRound?.puzzleId) return;

        let res: DailyGuessResult;
        try {
          const r = await fetch("/api/anyguessr/daily/guess", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              puzzleId: activeRound.puzzleId,
              guess: trimmed,
              roundIndex: get().currentRound,
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
          roundIndex: get().currentRound,
          clueType: activeRound.clueType,
          puzzleId: activeRound.puzzleId,
          guess: res.guess,
          answer: res.answer,
          distanceKm: res.distanceKm,
          roundScore: res.roundScore,
          exact: res.exact,
          flagUrl: res.flagUrl ?? undefined,
        };

        const roundResults = [...get().roundResults, roundResult];
        const totalScore = get().totalScore + res.roundScore;
        const currentRound = get().currentRound;
        const isLastRound = currentRound >= DAILY_ROUND_COUNT - 1;

        set({
          roundResults,
          totalScore,
          roundRecap: {
            roundIndex: currentRound,
            clueType: activeRound.clueType,
            guess: res.guess,
            answer: res.answer,
            distanceKm: res.distanceKm,
            roundScore: res.roundScore,
            exact: res.exact,
            flagUrl: res.flagUrl ?? undefined,
            answerLat: res.answerLat,
            answerLng: res.answerLng,
            guessLat: res.guessLat,
            guessLng: res.guessLng,
            answerCca3: res.answerCca3,
            guessCca3: res.guessCca3,
            isFinalRound: isLastRound,
          },
          feedback: null,
        });
      },

      continueDailyRound: () => {
        const s = get();
        if (!isDailyState(s) || !s.roundRecap) return;

        const isFinal = s.roundRecap.isFinalRound;
        set({
          roundRecap: null,
          feedback: null,
          ...(isFinal
            ? { status: "won" as const }
            : { currentRound: s.currentRound + 1 }),
        });

        if (isFinal) {
          void postDailyAttempt(get(), get().totalScore, get().roundResults.length);
        }
      },

      advanceDailyRound: () => {
        const s = get();
        if (!isDailyState(s)) return;
        if (s.currentRound >= DAILY_ROUND_COUNT - 1) return;
        set({ currentRound: s.currentRound + 1, feedback: null });
      },

      surrender: async () => {
        const s = get();
        if (s.status !== "playing" || !isDailyState(s)) return;

        const round = s.dailyRounds[s.currentRound];
        if (!round?.puzzleId) {
          set({ feedback: { type: "info", message: "Refreshing today's puzzle…" } });
          await get().initPuzzle();
          const refreshed = get().dailyRounds[get().currentRound];
          if (!refreshed?.puzzleId) {
            set({ feedback: { type: "info", message: "Couldn't load a puzzle. Try again." } });
            return;
          }
        }

        const activeRound = get().dailyRounds[get().currentRound];
        if (!activeRound?.puzzleId) return;

        let res: DailyGuessResult;
        try {
          const r = await fetch("/api/anyguessr/daily/surrender", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              puzzleId: activeRound.puzzleId,
              roundIndex: get().currentRound,
            }),
          });
          if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            throw new Error(err.error ?? "Failed to reveal answer");
          }
          res = (await r.json()) as DailyGuessResult;
        } catch (err) {
          console.error("anyguessr daily surrender failed:", err);
          set({ feedback: { type: "info", message: "Couldn't give up. Try again." } });
          return;
        }

        const roundResult: DailyRoundResult = {
          roundIndex: get().currentRound,
          clueType: activeRound.clueType,
          puzzleId: activeRound.puzzleId,
          guess: "",
          answer: res.answer,
          distanceKm: res.distanceKm,
          roundScore: 0,
          exact: false,
          surrendered: true,
          flagUrl: res.flagUrl ?? undefined,
        };

        const roundResults = [...get().roundResults, roundResult];
        const currentRound = get().currentRound;
        const isLastRound = currentRound >= DAILY_ROUND_COUNT - 1;

        set({
          roundResults,
          roundRecap: {
            roundIndex: currentRound,
            clueType: activeRound.clueType,
            guess: "",
            answer: res.answer,
            distanceKm: res.distanceKm,
            roundScore: 0,
            exact: false,
            surrendered: true,
            flagUrl: res.flagUrl ?? undefined,
            answerLat: res.answerLat,
            answerLng: res.answerLng,
            guessLat: null,
            guessLng: null,
            answerCca3: res.answerCca3,
            guessCca3: null,
            isFinalRound: isLastRound,
          },
          feedback: null,
        });
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
        status: s.status,
        startTime: s.startTime,
        dailyRounds: s.dailyRounds,
        currentRound: s.currentRound,
        roundResults: s.roundResults,
        totalScore: s.totalScore,
        roundRecap: s.roundRecap,
      }),
      merge: (persisted, current) => {
        const merged = {
          ...current,
          ...(persisted as PersistedData),
        };
        if (merged.mode !== "daily" || !hasValidDailyRounds(merged.dailyRounds)) {
          return {
            ...current,
            ...buildInitialState(),
          };
        }
        if (
          merged.roundRecap &&
          (!isValidLatLng(merged.roundRecap.answerLat, merged.roundRecap.answerLng) ||
            !merged.roundRecap.answerCca3)
        ) {
          merged.roundRecap = null;
        }
        return merged;
      },
    },
  ),
);

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
