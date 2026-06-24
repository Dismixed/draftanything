export type GameMode = "daily";

export interface Puzzle {
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
  score: number;
  gameStatus: "playing" | "completed";
  startTime: number;
}
