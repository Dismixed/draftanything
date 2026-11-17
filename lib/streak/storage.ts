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
/** Dead Reckoning kept its own list of finished days before it joined the shared streaks. */
const DEAD_RECKONING_LEGACY_KEY = "dead-reckoning:v1:finished";

function emptyStore(): StreakStore {
  return {
    version: 1,
    games: {
      chainlink: { playDates: [] },
      "brain-dead": { playDates: [] },
      anyguessr: { playDates: [] },
      freezeframes: { playDates: [] },
      "ball-knowledge": { playDates: [] },
      "hot-takes": { playDates: [] },
      "getting-warmer": { playDates: [] },
      "dead-reckoning": { playDates: [] },
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

function readLegacyDates(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    // Brain Dead kept { playDates }, Dead Reckoning a bare list of dates.
    const dates = Array.isArray(parsed) ? parsed : (parsed as { playDates?: unknown } | null)?.playDates;
    if (!Array.isArray(dates)) return [];
    return dates.filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d));
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

  const legacy: [DailyGameId, string][] = [
    ["brain-dead", BRAIN_DEAD_LEGACY_KEY],
    ["dead-reckoning", DEAD_RECKONING_LEGACY_KEY],
  ];
  let changed = false;
  for (const [id, key] of legacy) {
    const dates = readLegacyDates(key);
    const known = store.games[id].playDates;
    const added = dates.filter((d) => !known.includes(d));
    if (added.length === 0) continue;
    store.games[id].playDates = [...known, ...added];
    changed = true;
  }
  if (changed) writeStore(store);
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
