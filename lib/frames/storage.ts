import { recordDailyCompletion } from "@/lib/streak/storage";
import type { DailyPlayed, LeaderboardEntry } from "./types";
import { getDateString } from "./game-logic";

const ENTRY_ID_KEY = "frames_lb_entry_id";

function getTodayKey(): string {
  return `frames_played_${getDateString()}`;
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

export function saveDailyPlayed(score: number, max: number): void {
  if (typeof window === "undefined") return;
  const playDate = getDateString();
  localStorage.setItem(
    getTodayKey(),
    JSON.stringify({ score, max, ts: Date.now() }),
  );
  recordDailyCompletion("frames", playDate);
}

export async function fetchTodayLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch("/api/frames/leaderboard/daily");
    if (!res.ok) return [];
    const data = (await res.json()) as { entries: LeaderboardEntry[] };
    return data.entries ?? [];
  } catch {
    return [];
  }
}

export async function saveLeaderboardEntry(
  name: string,
  score: number,
): Promise<{ ok: boolean; id?: string }> {
  try {
    const res = await fetch("/api/frames/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        score,
        playDate: getDateString(),
      }),
    });
    if (!res.ok) return { ok: false };
    const data = (await res.json()) as { id?: string };
    if (data.id) setSubmittedEntryId(data.id);
    return { ok: true, id: data.id };
  } catch {
    return { ok: false };
  }
}
