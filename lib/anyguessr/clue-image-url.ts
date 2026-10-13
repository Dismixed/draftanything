/** Wide enough for the enlarged clue on a sharp screen. Wikimedia only serves a few fixed widths. */
const CLUE_IMAGE_WIDTH = 1280;

/**
 * The address to show a clue image from. Stored clues point at Wikimedia originals, which can
 * be ten megabytes; this asks Wikimedia for a screen-sized copy instead, and asks for flags
 * as vector files so they stay sharp. Anything unrecognised is returned unchanged.
 *
 * An original narrower than the requested width has no such copy, so callers should fall
 * back to the stored address if this one fails to load.
 */
export function clueDisplayUrl(url: string, width = CLUE_IMAGE_WIDTH): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  if (parsed.hostname === "flagcdn.com") {
    const flag = parsed.pathname.match(/^\/w\d+\/([a-z-]+)\.png$/);
    return flag ? `${parsed.origin}/${flag[1]}.svg` : url;
  }

  if (parsed.hostname !== "upload.wikimedia.org" && parsed.hostname !== "thumb.wikimedia.org") return url;

  const sized = parsed.pathname.match(/^(\/wikipedia\/[^/]+\/thumb\/[^/]+\/[^/]+\/[^/]+\/)(\d+)px-(.+)$/);
  if (sized) return Number(sized[2]) > width ? `${parsed.origin}${sized[1]}${width}px-${sized[3]}` : url;

  const original = parsed.pathname.match(/^\/wikipedia\/([^/]+)\/([0-9a-f]\/[0-9a-f]{2})\/([^/]+\.(?:jpe?g|png))$/i);
  if (!original) return url;
  const [, project, folder, file] = original;
  return `${parsed.origin}/wikipedia/${project}/thumb/${folder}/${file}/${width}px-${file}`;
}
