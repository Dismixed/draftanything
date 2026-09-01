import type { CSSProperties } from "react";
import { optimizedImageUrl } from "@/lib/hot-takes/image-url";

type HotTakesImageProps = {
  src?: string | null;
  alt: string;
  /** Display width in px, used to request an appropriately-sized source. */
  width: number;
  className?: string;
  style?: CSSProperties;
  draggable?: boolean;
};

/**
 * Renders a hot-takes image at an appropriately compressed size. Wikimedia
 * photos are rewritten to Wikimedia's CDN thumbnails so we never load a
 * full-resolution source; other sources pass through untouched.
 */
export function HotTakesImage({
  src,
  alt,
  width,
  className,
  style,
  draggable,
}: HotTakesImageProps) {
  const resolved = optimizedImageUrl(src, width);
  if (!resolved) return null;
  return (
    <img
      src={resolved}
      alt={alt}
      className={className}
      style={style}
      draggable={draggable}
    />
  );
}
