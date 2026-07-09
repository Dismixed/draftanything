import type { GuessHistoryRow } from "./types";

export const MAX_PTS = 1000;
export const WRONG_PEN = 150;
export const TIME_RATE = 4;
export const SNIPPET_SEC = 20;
export const MAX_DAILY_SCORE = MAX_PTS * 4;

export function getDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getDisplayDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function getCountdownText(): string {
  const now = new Date();
  const tom = new Date(now);
  tom.setDate(tom.getDate() + 1);
  tom.setHours(0, 0, 0, 0);
  const diff = tom.getTime() - now.getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function lev(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > Math.floor(Math.max(m, n) * 0.4)) return 999;
  const d = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] =
        a[i - 1] === b[j - 1]
          ? d[i - 1][j - 1]
          : 1 + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1]);
    }
  }
  return d[m][n];
}

export function fuzzyMatch(input: string, answer: string): boolean {
  const a = normalise(input);
  const b = normalise(answer);
  if (!a || !b) return false;
  if (a === b) return true;
  if (b.includes(a) && a.length >= Math.floor(b.length * 0.6)) return true;
  if (a.includes(b) && b.length >= Math.floor(a.length * 0.6)) return true;
  const dist = lev(a, b);
  const threshold = Math.max(2, Math.floor(Math.max(a.length, b.length) * 0.25));
  return dist <= threshold;
}

export function calcAvailablePoints(
  guesses: GuessHistoryRow[],
  startTime: number,
  now = Date.now(),
): number {
  const wrongs = guesses.filter((g) => !g.correct && !g.skip).length;
  const elapsed = (now - startTime) / 1000;
  return Math.max(
    50,
    Math.round(MAX_PTS - wrongs * WRONG_PEN - elapsed * TIME_RATE),
  );
}

export function calcRoundScore(
  correct: boolean,
  guesses: GuessHistoryRow[],
  startTime: number,
  now = Date.now(),
): number {
  if (!correct) return 0;
  return calcAvailablePoints(guesses, startTime, now);
}
