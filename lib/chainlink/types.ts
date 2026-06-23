export type GameMode = "daily" | "unlimited";

export interface Puzzle {
  theme: string;
  words: readonly string[];
}

export type WordStatus = "locked" | "active" | "solved";

export interface GameState {
  mode: GameMode;
  puzzle: Puzzle | null;
  date: string;
  currentWordIndex: number;
  wordStatuses: WordStatus[];
  wordAttempts: string[][];
  revealedLetters: boolean[][];
  hintsRemaining: number;
  themeGuessed: boolean;
  themeAttempts: string[];
  score: number;
  gameStatus: "playing" | "completed";
  startTime: number;
}
