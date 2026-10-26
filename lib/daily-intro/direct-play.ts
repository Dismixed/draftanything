import type { DailyGameId } from "@/lib/games/registry";

/** Where a direct play was asked for: a home page link, or another daily's finish screen. */
export type DirectPlaySource = "home" | "finish";

/**
 * Set when the home page opens a daily game, so the game starts without its intro. It lives in
 * memory, so it only survives a client-side navigation: shared links, reloads and new tabs still
 * get the intro.
 */
let pending: { game: DailyGameId; from: DirectPlaySource } | null = null;

export function requestDirectPlay(game: DailyGameId, from: DirectPlaySource = "home"): void {
  pending = { game, from };
}

export function isDirectPlayRequested(game: DailyGameId): boolean {
  return pending?.game === game;
}

/** Where the pending direct play for this game came from, or null when there is none. */
export function directPlaySource(game: DailyGameId): DirectPlaySource | null {
  return pending?.game === game ? pending.from : null;
}

export function clearDirectPlay(game: DailyGameId): void {
  if (pending?.game === game) pending = null;
}

/**
 * Opening another daily from a finish screen skips its intro, except Ball Knowledge: its clock
 * starts as soon as play begins, so the player lands on its intro and starts when ready.
 */
export function requestDirectPlayFromFinish(game: DailyGameId): void {
  if (game !== "ball-knowledge") requestDirectPlay(game, "finish");
}
