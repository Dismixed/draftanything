/** How far a clue photo is zoomed, and where its top-left corner sits inside its frame. */
export interface PhotoZoom {
  scale: number;
  x: number;
  y: number;
}

export interface FrameSize {
  width: number;
  height: number;
}

export const PHOTO_ZOOM_REST: PhotoZoom = { scale: 1, x: 0, y: 0 };
export const PHOTO_ZOOM_MAX = 6;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Keeps the photo covering its frame, so it can never be dragged off to leave a gap. */
function settle(scale: number, x: number, y: number, frame: FrameSize): PhotoZoom {
  if (scale <= 1) return PHOTO_ZOOM_REST;
  return {
    scale,
    x: clamp(x, frame.width * (1 - scale), 0),
    y: clamp(y, frame.height * (1 - scale), 0),
  };
}

/** Zooms to `scale`, keeping the spot under `point` (measured from the frame's corner) still. */
export function zoomPhotoAt(zoom: PhotoZoom, scale: number, point: { x: number; y: number }, frame: FrameSize): PhotoZoom {
  const next = clamp(scale, 1, PHOTO_ZOOM_MAX);
  const ratio = next / zoom.scale;
  return settle(next, point.x - (point.x - zoom.x) * ratio, point.y - (point.y - zoom.y) * ratio, frame);
}

/** Drags a zoomed photo. A photo at rest has nowhere to go. */
export function panPhoto(zoom: PhotoZoom, dx: number, dy: number, frame: FrameSize): PhotoZoom {
  if (zoom.scale <= 1) return zoom;
  return settle(zoom.scale, zoom.x + dx, zoom.y + dy, frame);
}
