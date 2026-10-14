import type { DailyGameId } from "@/lib/games/registry";

/**
 * Set when the home page opens a daily game, so the game starts without its intro. It lives in
 * memory, so it only survives a client-side navigation: shared links, reloads and new tabs still
 * get the intro.
 */
let pending: DailyGameId | null = null;

export function requestDirectPlay(game: DailyGameId): void {
  pending = game;
}

export function isDirectPlayRequested(game: DailyGameId): boolean {
  return pending === game;
}

export function clearDirectPlay(game: DailyGameId): void {
  if (pending === game) pending = null;
}
