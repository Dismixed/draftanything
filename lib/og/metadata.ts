import type { GameId } from "@/lib/games/registry";

export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 };

/** "home" is the site-wide image; every game has its own. */
export type ShareImageId = GameId | "home";

export function shareImagePath(id: ShareImageId): string {
  return `/og/${id}`;
}

/** An entry for a page's `openGraph.images`. */
export function shareImage(id: ShareImageId, alt: string) {
  return { url: shareImagePath(id), ...SHARE_IMAGE_SIZE, alt };
}
