import { getGame, type DailyGameId } from "@/lib/games/registry";
import { absoluteUrl } from "@/lib/seo";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-06" → "Oct 6". Takes the puzzle's own date string, so no timezone maths. */
export function formatShareDate(dateString: string): string {
  const [, month, day] = dateString.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}`;
}

export function shareUrl(gameId: DailyGameId): string {
  return `${absoluteUrl(getGame(gameId).playHref)}?ref=share`;
}

export function buildShareText(input: { gameId: DailyGameId; label: string; lines: string[] }): string {
  return [
    `${getGame(input.gameId).name} · ${input.label}`,
    ...input.lines.filter((line) => line.trim() !== ""),
    shareUrl(input.gameId),
  ].join("\n");
}

const SQUARE = { good: "🟩", ok: "🟨", bad: "🟥" } as const;

export function squares(values: Array<keyof typeof SQUARE>): string {
  return values.map((value) => SQUARE[value]).join("");
}
