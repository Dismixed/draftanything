const WIKIMEDIA_HOST = "upload.wikimedia.org";

/**
 * Wikimedia only serves hotlinked thumbnails at these fixed widths (T414805).
 * Arbitrary sizes are rejected with a 400. Round up to the nearest step.
 */
const STANDARD_SIZES = [20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840];

function standardThumbWidth(target: number): number {
  for (const size of STANDARD_SIZES) {
    if (size >= target) return size;
  }
  return STANDARD_SIZES[STANDARD_SIZES.length - 1]!;
}

/** SVG sources render as PNG thumbnails on Wikimedia's thumb service. */
function thumbTargetName(filename: string): string {
  return /\.svg$/i.test(filename) ? `${filename}.png` : filename;
}

/**
 * Rewrites a full-resolution Wikimedia Commons upload URL into a resized
 * thumbnail served by Wikimedia's own CDN (e.g. a 3840px or original file
 * becomes a ~120px thumb). This avoids downloading multi-megabyte source
 * photos and resizing them ourselves.
 *
 * Handles both forms:
 *   - original:    /wikipedia/commons/{a}/{ab}/{File}.jpg
 *   - existing:    /wikipedia/commons/thumb/{a}/{ab}/{File}.jpg/3840px-{File}.jpg
 */
function wikimediaThumbUrl(url: URL, width: number): string {
  const path = url.pathname;

  // Already a thumbnail ("…/3840px-File.jpg") — swap the width prefix.
  const existing = path.match(/^(.*\/)(\d+)px-([^/]+)$/);
  if (existing) {
    return `${url.origin}${existing[1]}${width}px-${existing[3]}`;
  }

  // Original file ("…/commons/{a}/{ab}/{File}") — insert /thumb/ and append size.
  const lastSlash = path.lastIndexOf("/");
  const dir = path.slice(0, lastSlash);
  const filename = path.slice(lastSlash + 1);
  const thumbDir = dir.replace(/\/commons(?=\/|$)/, "/commons/thumb");
  return `${url.origin}${thumbDir}/${filename}/${width}px-${thumbTargetName(filename)}`;
}

/**
 * Returns a compressed, appropriately-sized source URL for a hot-takes image.
 * Wikimedia photos are rewritten to Wikimedia thumbnails; everything else
 * (generated icons, manual URLs, placeholders) is passed through unchanged.
 */
export function optimizedImageUrl(
  src: string | null | undefined,
  displayWidth: number,
): string | null {
  if (!src) return null;

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    // Not an absolute URL (data:, relative, etc.) — leave untouched.
    return src;
  }

  if (url.hostname !== WIKIMEDIA_HOST) return src;

  // Request ~2x the display size (retina), snapped to a standard thumbnail step.
  const target = Math.max(1, Math.ceil(displayWidth * 2));
  return wikimediaThumbUrl(url, standardThumbWidth(target));
}
