import { recordDailyCompletion } from "@/lib/streak/storage";
import type { DailyPlayed, LeaderboardEntry } from "./types";
import { getDateString } from "./game-logic";
import type { LocalPersonalStats } from "./stats";

const ENTRY_ID_KEY = "bd_lb_entry_id";
const PERSONAL_STATS_KEY = "bd_personal_stats";

function getTodayKey(): string {
  return `bd_daily_${getDateString()}`;
}

export function getSubmittedEntryId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ENTRY_ID_KEY);
  } catch {
    return null;
  }
}

function setSubmittedEntryId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ENTRY_ID_KEY, id);
}

export function getDailyPlayed(): DailyPlayed | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(getTodayKey()) || "null");
  } catch {
    return null;
  }
}

export function getLocalPersonalStats(): LocalPersonalStats {
  if (typeof window === "undefined") {
    return { bestScore: 0, playDates: [] };
  }
  try {
    const raw = localStorage.getItem(PERSONAL_STATS_KEY);
    if (!raw) return { bestScore: 0, playDates: [] };
    const parsed = JSON.parse(raw) as Partial<LocalPersonalStats>;
    return {
      bestScore:
        typeof parsed.bestScore === "number" ? parsed.bestScore : 0,
      playDates: Array.isArray(parsed.playDates)
        ? parsed.playDates.filter((d): d is string => typeof d === "string")
        : [],
    };
  } catch {
    return { bestScore: 0, playDates: [] };
  }
}

function saveLocalPersonalStats(stats: LocalPersonalStats): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PERSONAL_STATS_KEY, JSON.stringify(stats));
}

function recordLocalDailyPlay(score: number, playDate = getDateString()): void {
  const stats = getLocalPersonalStats();
  if (score > stats.bestScore) {
    stats.bestScore = score;
  }
  if (!stats.playDates.includes(playDate)) {
    stats.playDates.push(playDate);
  }
  saveLocalPersonalStats(stats);
}

export function saveDailyPlayed(score: number, correct: number): void {
  if (typeof window === "undefined") return;
  const playDate = getDateString();
  localStorage.setItem(
    getTodayKey(),
    JSON.stringify({ score, correct, ts: Date.now() }),
  );
  recordLocalDailyPlay(score, playDate);
  recordDailyCompletion("brain-dead", playDate);
}

export async function fetchTodayLeaderboard(): Promise<LeaderboardEntry[]> {
  const playDate = getDateString();
  const yourEntryId = getSubmittedEntryId();

  try {
    const res = await fetch(`/api/brain-dead/leaderboard/daily?date=${playDate}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { entries: LeaderboardEntry[] };
    return (data.entries ?? []).map((entry) => ({
      ...entry,
      you: yourEntryId ? entry.id === yourEntryId : false,
    }));
  } catch {
    return [];
  }
}

export async function saveLeaderboardEntry(
  name: string,
  score: number,
  correct: number,
): Promise<{ ok: true; id: string } | { ok: false }> {
  try {
    const res = await fetch("/api/brain-dead/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        name,
        score,
        correct,
        playDate: getDateString(),
      }),
    });
    if (!res.ok) return { ok: false };
    const data = (await res.json()) as { id: string };
    if (data.id) setSubmittedEntryId(data.id);
    return { ok: true, id: data.id };
  } catch {
    return { ok: false };
  }
}
