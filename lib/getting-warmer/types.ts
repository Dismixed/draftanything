export interface DailyPuzzleClient {
  date: string;
  dayNumber: number;
  initialClues: string[];
  authoredClueCount: number;
}

export interface DailyPlayed {
  won: boolean;
  attempts: number;
  ts: number;
  answer?: string;
  guesses?: string[];
  gaveUp?: boolean;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  guesses: number;
  date: string;
  ts: number;
}

export interface PuzzleRow {
  id: string;
  answer: string;
  clues: string[];
  status: string;
  created_at: string;
}
