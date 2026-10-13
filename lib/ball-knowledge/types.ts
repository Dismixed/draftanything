export type AnswerStatus = "pending" | "ok" | "bad";

export interface AnswerEntry {
  id: string;
  text: string;
  displayText: string;
  status: AnswerStatus;
  reason: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  date: string;
  ts: number;
}

export interface DailyPlayed {
  score: number;
  category: string;
  ts: number;
  /** Accepted answers, absent on results saved before they were kept. */
  accepted?: string[];
}

export interface JudgeResult {
  valid: boolean;
  canonical: string;
  reason: string;
}
