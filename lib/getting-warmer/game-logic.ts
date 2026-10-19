import { dailyDate } from "@/lib/daily-day";
export const INITIAL_CLUES = 2;
export const MAX_LEADERBOARD_GUESSES = 500;

const EPOCH = new Date("2025-01-01T00:00:00Z").getTime();

export function getDateString(date = new Date()): string {
  return dailyDate(date);
}

export function getDayNumber(date = new Date()): number {
  return Math.floor((date.getTime() - EPOCH) / 86_400_000) + 1;
}

export function normalizeGuess(str: string): string {
  return str.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function guessesMatch(guess: string, answer: string): boolean {
  const g = normalizeGuess(guess);
  const a = normalizeGuess(answer);
  if (!g || !a) return false;
  return g === a;
}

export function getLetterRevealClue(answer: string, revealCount: number): string {
  let letterIdx = 0;
  const masked = answer
    .split("")
    .map((ch) => {
      if (ch === " ") return "  ";
      letterIdx += 1;
      return (letterIdx <= revealCount ? ch : "_") + " ";
    })
    .join("")
    .trim();
  return `Letters so far: ${masked}`;
}

export function validateClueState(
  revealedClueCount: number,
  wrongGuesses: string[],
  authoredClueCount: number,
  extraClues: string[],
): boolean {
  if (revealedClueCount < INITIAL_CLUES) return false;
  if (wrongGuesses.length !== revealedClueCount - INITIAL_CLUES) return false;

  const aiCluesNeeded = Math.max(0, revealedClueCount - authoredClueCount);
  if (extraClues.length > aiCluesNeeded) return false;

  return true;
}
