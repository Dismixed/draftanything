import { computeStreak } from "./compute";
import { getDateString } from "./date";
import {
  DAILY_GAMES,
  GAME_META,
  type DailyGameId,
  type GameStreakInfo,
  type StreakCompletionResult,
  type StreakStore,
} from "./types";

const STORAGE_KEY = "stim_daily_streaks";
const BRAIN_DEAD_LEGACY_KEY = "bd_personal_stats";

function emptyStore(): StreakStore {
  return {
    version: 1,
    games: {
      chainlink: { playDates: [] },
      "brain-dead": { playDates: [] },
      anyguessr: { playDates: [] },
      frames: { playDates: [] },
    },
  };
}

function parseStore(raw: string | null): StreakStore {
  if (!raw) return emptyStore();
  try {
    const parsed = JSON.parse(raw) as Partial<StreakStore>;
    const base = emptyStore();
    if (parsed.games) {
      for (const id of DAILY_GAMES) {
        const dates = parsed.games[id]?.playDates;
        if (Array.isArray(dates)) {
          base.games[id].playDates = dates.filter(
            (d): d is string => typeof d === "string",
          );
        }
      }
    }
    return base;
  } catch {
    return emptyStore();
  }
}

function readLegacyBrainDeadDates(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BRAIN_DEAD_LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { playDates?: unknown };
    if (!Array.isArray(parsed.playDates)) return [];
    return parsed.playDates.filter((d): d is string => typeof d === "string");
  } catch {
    return [];
  }
}

function writeStore(store: StreakStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

let migrated = false;

function ensureMigrated(store: StreakStore): StreakStore {
  if (migrated || typeof window === "undefined") return store;
  migrated = true;

  const legacyDates = readLegacyBrainDeadDates();
  if (legacyDates.length === 0) return store;

  const merged = new Set([
    ...store.games["brain-dead"].playDates,
    ...legacyDates,
  ]);
  store.games["brain-dead"].playDates = [...merged];
  writeStore(store);
  return store;
}

export function readStreakStore(): StreakStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const store = parseStore(localStorage.getItem(STORAGE_KEY));
    return ensureMigrated(store);
  } catch {
    return emptyStore();
  }
}

export function recordDailyCompletion(
  gameId: DailyGameId,
  playDate = getDateString(),
): StreakCompletionResult {
  const store = readStreakStore();
  const game = store.games[gameId];
  const isNew = !game.playDates.includes(playDate);

  if (isNew) {
    game.playDates.push(playDate);
    writeStore(store);
  }

  const streak = computeStreak(game.playDates, playDate);

  if (isNew && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("stim-streak-completed", {
        detail: { isNew, streak, gameId },
      }),
    );
  }

  return { isNew, streak, gameId };
}

export function getGameStreak(
  gameId: DailyGameId,
  today = getDateString(),
): GameStreakInfo {
  const store = readStreakStore();
  const playDates = store.games[gameId].playDates;
  const meta = GAME_META[gameId];

  return {
    id: gameId,
    label: meta.label,
    href: meta.href,
    currentStreak: computeStreak(playDates, today),
    playedToday: playDates.includes(today),
  };
}

export function getAllGameStreaks(today = getDateString()): GameStreakInfo[] {
  return DAILY_GAMES.map((id) => getGameStreak(id, today));
}
