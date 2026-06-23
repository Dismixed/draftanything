import type { DailyPlayed, LeaderboardEntry } from "./types";
import { getDateString } from "./game-logic";

const PLAYER_TOKEN_KEY = "bd_player_token";
const ENTRY_ID_KEY = "bd_lb_entry_id";

function getTodayKey(): string {
  return `bd_daily_${getDateString()}`;
}

export function getPlayerToken(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = localStorage.getItem(PLAYER_TOKEN_KEY);
    if (existing) return existing;
    const token = crypto.randomUUID();
    localStorage.setItem(PLAYER_TOKEN_KEY, token);
    return token;
  } catch {
    return crypto.randomUUID();
  }
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

export function saveDailyPlayed(score: number, correct: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    getTodayKey(),
    JSON.stringify({ score, correct, ts: Date.now() }),
  );
}

export async function fetchTodayLeaderboard(): Promise<LeaderboardEntry[]> {
  const playDate = getDateString();
  const yourEntryId = getSubmittedEntryId();

  try {
    const res = await fetch(`/api/brain-dead/leaderboard?date=${playDate}`);
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
      body: JSON.stringify({
        playerToken: getPlayerToken(),
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
