export const DAILY_GAMES = ["chainlink", "brain-dead", "anyguessr"] as const;

export type DailyGameId = (typeof DAILY_GAMES)[number];

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

export const GAME_META: Record<
  DailyGameId,
  { label: string; href: string }
> = {
  chainlink: { label: "Chainlink", href: "/chainlink/daily" },
  "brain-dead": { label: "Brain Dead", href: "/brain-dead/daily" },
  anyguessr: { label: "AnyGuessr", href: "/anyguessr/daily" },
};
