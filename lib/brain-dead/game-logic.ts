import type { Category } from "./types";

export const CATEGORIES: Category[] = [
  { id: "general", name: "General", emoji: "🎯" },
  { id: "sports", name: "Sports", emoji: "🏀" },
  { id: "movies", name: "Movies", emoji: "🎬" },
  { id: "music", name: "Music", emoji: "🎵" },
  { id: "arts", name: "Arts & Lit", emoji: "📚" },
  { id: "science", name: "Science", emoji: "🔬" },
  { id: "history", name: "History", emoji: "📜" },
  { id: "food", name: "Food", emoji: "🍕" },
  { id: "culture", name: "Culture", emoji: "🌐" },
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
