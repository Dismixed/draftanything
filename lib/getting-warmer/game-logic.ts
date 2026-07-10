export const INITIAL_CLUES = 2;
export const MAX_LEADERBOARD_GUESSES = 500;

const EPOCH = new Date("2025-01-01T00:00:00Z").getTime();

export function getDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function getDayNumber(date = new Date()): number {
  return Math.floor((date.getTime() - EPOCH) / 86_400_000) + 1;
}

export function getCountdownText(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const diff = tomorrow.getTime() - now.getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
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
