export type Difficulty = 1 | 2 | 3 | 4;

export type CategoryId =
  | "general"
  | "sports"
  | "movies"
  | "music"
  | "arts"
  | "science"
  | "history"
  | "food"
  | "culture"
  | "geography"
  | "random";

export interface Category {
  id: CategoryId;
  name: string;
  emoji: string;
}

export interface Question {
  q: string;
  a: string[];
  c: number;
  d: Difficulty;
}

export type GameMode = "daily" | "freeplay";

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  correct: number;
  date: string;
  you?: boolean;
  ts: number;
}

export interface DailyPlayed {
  score: number;
  correct: number;
  ts: number;
}

export interface AllTimeEntry {
  playerId: string;
  name: string;
  avatarUrl: string | null;
  bestScore: number;
  bestCorrect: number;
  gamesPlayed: number;
}
