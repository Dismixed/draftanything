import { getGame, type DailyGameId } from "@/lib/games/registry";
import { encodeResult, type SharedResult } from "@/lib/share/result-link";
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

/**
 * Where a shared result links to: a page that shows the friend's result, unfurls as a picture
 * of it, and leads into the game. Falls back to the game itself if there is nothing to show.
 */
export function resultUrl(gameId: DailyGameId, result: SharedResult): string {
  const encoded = encodeResult(result);
  return encoded ? absoluteUrl(`/s/${gameId}?r=${encoded}`) : shareUrl(gameId);
}

export function buildShareText(input: { gameId: DailyGameId; label: string; lines: string[] }): string {
  const lines = input.lines.filter((line) => line.trim() !== "");
  return [
    `${getGame(input.gameId).name} · ${input.label}`,
    ...lines,
    resultUrl(input.gameId, { label: input.label, lines }),
  ].join("\n");
}

const SQUARE = { good: "🟩", ok: "🟨", bad: "🟥" } as const;

export function squares(values: Array<keyof typeof SQUARE>): string {
  return values.map((value) => SQUARE[value]).join("");
}
