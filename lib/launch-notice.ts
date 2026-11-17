import { GAMES } from "@/lib/games/registry";

/**
 * A one-time notice that Dead Reckoning has launched: a pop-up on the home page, and a banner
 * on the other games for visitors who arrived on a game rather than through the home page.
 * Closing either, clicking either, opening Dead Reckoning or having played it ends it for good.
 */

/** The last daily date the notice shows on. After it, nobody sees it. */
export const NOTICE_UNTIL = "2026-12-01";

const DONE_KEY = "stim-notice:dead-reckoning";
/** The first page of this visit, kept for the tab's lifetime. */
const ENTRY_KEY = "stim-entry-path";

const NEW_GAME_PATH = "/dead-reckoning";

export type NoticeKind = "popup" | "banner";

function under(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** "/ball-knowledge" for "/ball-knowledge/daily": the folder each game's pages live under. */
const GAME_ROOTS = [...new Set(GAMES.map((game) => `/${game.playHref.split("/")[1]}`))];

/** Every game's pages, except the new game's own. */
export function isOtherGamePath(pathname: string): boolean {
  if (under(pathname, NEW_GAME_PATH)) return false;
  return GAME_ROOTS.some((root) => under(pathname, root));
}

export function isNewGamePath(pathname: string): boolean {
  return under(pathname, NEW_GAME_PATH);
}

export interface NoticeState {
  pathname: string;
  /** Where this visit started. */
  entry: string;
  /** The notice was closed or clicked, or the game was opened, on an earlier page or visit. */
  done: boolean;
  /** The visitor has finished a voyage. */
  playedNewGame: boolean;
  /** Today's daily date, YYYY-MM-DD. */
  today: string;
}

export function noticeFor({ pathname, entry, done, playedNewGame, today }: NoticeState): NoticeKind | null {
  if (done || playedNewGame || today > NOTICE_UNTIL) return null;
  if (pathname === "/") return "popup";
  // Someone who started on the home page has already been offered the pop-up there.
  if (isOtherGamePath(pathname) && entry !== "/") return "banner";
  return null;
}

function safe<T>(read: () => T, fallback: T): T {
  try {
    return read();
  } catch {
    return fallback;
  }
}

export function readDone(): boolean {
  return safe(() => localStorage.getItem(DONE_KEY) === "1", false);
}

export function markDone(): void {
  safe(() => localStorage.setItem(DONE_KEY, "1"), undefined);
}

/** Notes the first page of the visit, and returns it. Later pages of the visit leave it alone. */
export function rememberEntry(pathname: string): string {
  return safe(() => {
    const seen = sessionStorage.getItem(ENTRY_KEY);
    if (seen) return seen;
    sessionStorage.setItem(ENTRY_KEY, pathname);
    return pathname;
  }, pathname);
}
