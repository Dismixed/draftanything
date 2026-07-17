export const DAILY_GAMES = [
  "chainlink",
  "brain-dead",
  "anyguessr",
  "freezeframes",
  "ball-knowledge",
  "hot-takes",
  "getting-warmer",
] as const;

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

export interface DailyGameTheme {
  background: string;
  border: string;
  accent: string;
  text: string;
}

export const GAME_META: Record<
  DailyGameId,
  { label: string; href: string; theme: DailyGameTheme }
> = {
  chainlink: {
    label: "Chainlink",
    href: "/chainlink/daily",
    theme: {
      background: "var(--cl-card)",
      border: "var(--cl-border)",
      accent: "var(--cl-green)",
      text: "var(--cl-text)",
    },
  },
  "brain-dead": {
    label: "Brain Dead",
    href: "/brain-dead/daily",
    theme: {
      background: "var(--bd-surface)",
      border: "var(--bd-border)",
      accent: "var(--bd-primary)",
      text: "var(--bd-text)",
    },
  },
  anyguessr: {
    label: "AnyGuessr",
    href: "/anyguessr/daily",
    theme: {
      background: "var(--ag-surface)",
      border: "var(--ag-border)",
      accent: "var(--ag-accent)",
      text: "var(--ag-text)",
    },
  },
  freezeframes: {
    label: "FreezeFrames",
    href: "/freezeframes/daily",
    theme: {
      background: "var(--ff-surface)",
      border: "var(--ff-border)",
      accent: "var(--ff-purple-light)",
      text: "var(--ff-text)",
    },
  },
  "ball-knowledge": {
    label: "Ball Knowledge",
    href: "/ball-knowledge/daily",
    theme: {
      background: "var(--bk-backboard)",
      border: "var(--bk-line)",
      accent: "var(--bk-net-blue)",
      text: "var(--bk-chalk)",
    },
  },
  "hot-takes": {
    label: "Hot Takes",
    href: "/hot-takes",
    theme: {
      background: "var(--ht-surface)",
      border: "var(--ht-line)",
      accent: "var(--ht-accent)",
      text: "var(--ht-text)",
    },
  },
  "getting-warmer": {
    label: "Getting Warmer",
    href: "/getting-warmer/daily",
    theme: {
      background: "var(--gw-bg)",
      border: "rgba(255, 107, 26, 0.25)",
      accent: "var(--gw-orange)",
      text: "var(--gw-ink)",
    },
  },
};
