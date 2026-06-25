"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getAllGameStreaks, recordDailyCompletion } from "./storage";
import {
  GAME_META,
  type DailyGameId,
  type GameStreakInfo,
  type StreakCompletionResult,
} from "./types";

export interface StreakNotification extends StreakCompletionResult {
  label: string;
  id: number;
}

interface StreakContextValue {
  streaks: GameStreakInfo[];
  refreshStreaks: () => void;
  recordCompletion: (gameId: DailyGameId) => StreakCompletionResult;
  notification: StreakNotification | null;
  dismissNotification: () => void;
}

const StreakContext = createContext<StreakContextValue | null>(null);

export function StreakProvider({ children }: { children: ReactNode }) {
  const [streaks, setStreaks] = useState<GameStreakInfo[]>([]);
  const [notification, setNotification] = useState<StreakNotification | null>(
    null,
  );

  const refreshStreaks = useCallback(() => {
    setStreaks(getAllGameStreaks());
  }, []);

  useEffect(() => {
    refreshStreaks();
  }, [refreshStreaks]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<StreakCompletionResult>).detail;
      refreshStreaks();
      if (!detail.isNew) return;
      setNotification({
        ...detail,
        label: GAME_META[detail.gameId].label,
        id: Date.now(),
      });
    };

    window.addEventListener("stim-streak-completed", handler);
    return () => window.removeEventListener("stim-streak-completed", handler);
  }, [refreshStreaks]);

  const dismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const recordCompletion = useCallback(
    (gameId: DailyGameId): StreakCompletionResult => {
      return recordDailyCompletion(gameId);
    },
    [],
  );

  const value = useMemo(
    () => ({
      streaks,
      refreshStreaks,
      recordCompletion,
      notification,
      dismissNotification,
    }),
    [
      streaks,
      refreshStreaks,
      recordCompletion,
      notification,
      dismissNotification,
    ],
  );

  return (
    <StreakContext.Provider value={value}>{children}</StreakContext.Provider>
  );
}

export function useStreak() {
  const ctx = useContext(StreakContext);
  if (!ctx) {
    throw new Error("useStreak must be used within StreakProvider");
  }
  return ctx;
}

export function useStreakOptional() {
  return useContext(StreakContext);
}
