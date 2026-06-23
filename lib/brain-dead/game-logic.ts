import type { Category, CategoryId, Question } from "./types";
import { ALL_QUESTIONS } from "./questions";

export const CATEGORIES: Category[] = [
  { id: "general", name: "General", emoji: "🎯" },
  { id: "sports", name: "Sports", emoji: "🏀" },
  { id: "movies", name: "Movies", emoji: "🎬" },
  { id: "music", name: "Music", emoji: "🎵" },
  { id: "science", name: "Science", emoji: "🔬" },
  { id: "history", name: "History", emoji: "📜" },
  { id: "food", name: "Food", emoji: "🍕" },
  { id: "tech", name: "Tech", emoji: "💻" },
  { id: "geography", name: "Geography", emoji: "🌍" },
  { id: "random", name: "Random Mix", emoji: "🎲" },
];

export const TIMER_MAX = 30;
export const LETTERS = ["A", "B", "C", "D"] as const;

export const DIFF_LABELS: Record<number, string> = {
  1: "Easy",
  2: "Medium",
  3: "Hard",
  4: "Brutal",
};

export function getDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  function rng() {
    h ^= h << 13;
    h ^= h >> 7;
    h ^= h << 17;
    return (h >>> 0) / 0xffffffff;
  }
  return [...arr].sort(() => rng() - 0.5);
}

function buildProgressivePool(pool: Question[]): Question[] {
  const byDiff: Record<number, Question[]> = { 1: [], 2: [], 3: [], 4: [] };
  pool.forEach((q) => byDiff[q.d].push(q));
  Object.keys(byDiff).forEach((d) => {
    byDiff[Number(d)] = shuffle(byDiff[Number(d)]);
  });
  return [
    ...byDiff[1].slice(0, 3),
    ...byDiff[2].slice(0, 4),
    ...byDiff[3].slice(0, 4),
    ...byDiff[4].slice(0, 4),
  ];
}

export function getProgressiveQuestions(cat: CategoryId): Question[] {
  const pool =
    cat === "random"
      ? Object.values(ALL_QUESTIONS).flat()
      : ALL_QUESTIONS[cat] ?? [];
  return buildProgressivePool(pool);
}

export function getDailyQuestions(): Question[] {
  const seed = getDateString();
  const all = Object.values(ALL_QUESTIONS).flat();
  const seeded = seededShuffle(all, seed);
  const byDiff: Record<number, Question[]> = { 1: [], 2: [], 3: [], 4: [] };
  seeded.forEach((q) => byDiff[q.d].push(q));
  return [
    ...byDiff[1].slice(0, 3),
    ...byDiff[2].slice(0, 4),
    ...byDiff[3].slice(0, 4),
    ...byDiff[4].slice(0, 4),
  ];
}

export function calcScore(difficulty: number, timeTaken: number): number {
  const base = difficulty * 100;
  const speed = Math.round(((TIMER_MAX - timeTaken) / TIMER_MAX) * difficulty * 50);
  return base + speed;
}

export function getResultCopy(correct: number): {
  icon: string;
  title: string;
  sub: string;
} {
  const icons = ["💀", "😬", "🤔", "😬", "🔥", "🔥", "🔥", "🧠", "🧠", "🧠", "🏆", "🏆", "🏆", "🏆", "🏆", "🏆"];
  const titles: Record<number, string> = {
    0: "Brain Dead.",
    1: "Close Enough?",
    3: "Getting Warm.",
    5: "Not Bad.",
    8: "Big Brain Energy.",
    12: "Absolutely Cooked It.",
  };
  const subs: Record<number, string> = {
    0: "Zero correct. The questions send their regards.",
    1: "One answer right. That's... something.",
    3: "Three right. You're warming up — or cooling down, hard to say.",
    5: "Five right. Comfortably average. We mean that kindly.",
    8: "Eight right. You might actually know stuff.",
    12: "Twelve right?! Sit down, genius. You're making us look bad.",
  };

  let titleKey = 0;
  let subKey = 0;
  [0, 1, 3, 5, 8, 12].forEach((k) => {
    if (correct >= k) {
      titleKey = k;
      subKey = k;
    }
  });

  return {
    icon: icons[Math.min(correct, icons.length - 1)],
    title: titles[titleKey],
    sub: subs[subKey],
  };
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
