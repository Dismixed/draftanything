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
      background: "#1a1a1b",
      border: "#3a3a3c",
      accent: "#6aaa64",
      text: "#ffffff",
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
      background: "#130f1e",
      border: "#2d2550",
      accent: "#a855f7",
      text: "#f0eaff",
    },
  },
  "ball-knowledge": {
    label: "Ball Knowledge",
    href: "/ball-knowledge/daily",
    theme: {
      background: "#122a52",
      border: "rgba(140, 170, 220, 0.18)",
      accent: "#5b9ee8",
      text: "#eef4ff",
    },
  },
  "hot-takes": {
    label: "Hot Takes",
    href: "/hot-takes",
    theme: {
      background: "#16161c",
      border: "#2a2a34",
      accent: "#ff5a36",
      text: "#f5f4f2",
    },
  },
  "getting-warmer": {
    label: "Getting Warmer",
    href: "/getting-warmer/daily",
    theme: {
      background: "#0a0705",
      border: "rgba(255, 107, 26, 0.25)",
      accent: "#ff6b1a",
      text: "#fff3e8",
    },
  },
};
