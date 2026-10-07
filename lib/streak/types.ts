import { DAILY_GAMES, getGame, type DailyGameId } from "@/lib/games/registry";

export { DAILY_GAMES, type DailyGameId };

export interface GameStreakState {
  playDates: string[];
}

export interface StreakStore {
  version: 1;
  games: Record<DailyGameId, GameStreakState>;
}

export interface GameStreakInfo {
  id: DailyGameId;
  label: string;
  href: string;
  currentStreak: number;
  playedToday: boolean;
}

export interface StreakCompletionResult {
  isNew: boolean;
  streak: number;
  gameId: DailyGameId;
}

export interface DailyGameTheme {
  background: string;
  border: string;
  accent: string;
  text: string;
}

export interface DailyGameMeta {
  label: string;
  href: string;
  blurb: string;
  theme: DailyGameTheme;
}

export const GAME_META = Object.fromEntries(
  DAILY_GAMES.map((id) => {
    const game = getGame(id);
    const meta: DailyGameMeta = {
      label: game.name,
      href: game.playHref,
      blurb: game.blurb,
      theme: {
        background: game.theme.background,
        border: game.theme.border,
        accent: game.theme.accent,
        text: game.theme.text,
      },
    };
    return [id, meta];
  }),
) as Record<DailyGameId, DailyGameMeta>;
