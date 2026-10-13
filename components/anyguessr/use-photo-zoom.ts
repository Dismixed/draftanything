"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PHOTO_ZOOM_REST, panPhoto, zoomPhotoAt, type PhotoZoom } from "@/lib/anyguessr/photo-zoom";

/** Safari reports a trackpad pinch through its own gesture events instead of the wheel. */
type GestureEvent = Event & { scale: number; clientX: number; clientY: number };

const DOUBLE_CLICK_SCALE = 2.5;

/**
 * Zooming a clue photo inside its frame: scroll or pinch to zoom toward the pointer, drag to
 * move around, double-click to jump in and back out.
 */
export function usePhotoZoom(enabled: boolean) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<PhotoZoom>(PHOTO_ZOOM_REST);
  const [dragging, setDragging] = useState(false);
  const reset = useCallback(() => setZoom(PHOTO_ZOOM_REST), []);

  useEffect(() => {
    const el = frameRef.current;
    if (!el || !enabled) return;

    const frame = () => ({ width: el.clientWidth, height: el.clientHeight });
    const pointIn = (clientX: number, clientY: number) => {
      const box = el.getBoundingClientRect();
      return { x: clientX - box.left, y: clientY - box.top };
    };
    const scaleBy = (ratio: number, clientX: number, clientY: number) =>
      setZoom((z) => zoomPhotoAt(z, z.scale * ratio, pointIn(clientX, clientY), frame()));

    const onWheel = (e: WheelEvent) => {
      // Handled here so the page neither scrolls nor zooms as a whole.
      e.preventDefault();
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      // A trackpad pinch arrives as a wheel with ctrl held, in much smaller steps.
      scaleBy(Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.0025)), e.clientX, e.clientY);
    };

    let gestureScale = 1;
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      gestureScale = 1;
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const g = e as GestureEvent;
      scaleBy(g.scale / gestureScale, g.clientX, g.clientY);
      gestureScale = g.scale;
    };

    const pointers = new Map<number, { x: number; y: number }>();
    const spread = () => {
      const [a, b] = [...pointers.values()];
      return { gap: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if ((e.target as Element).closest("button, audio")) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      el.setPointerCapture(e.pointerId);
      setDragging(true);
    };
    const onPointerMove = (e: PointerEvent) => {
      const last = pointers.get(e.pointerId);
      if (!last) return;
      if (pointers.size === 1) {
        setZoom((z) => panPhoto(z, e.clientX - last.x, e.clientY - last.y, frame()));
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        return;
      }
      const before = spread();
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const after = spread();
      if (before.gap > 0) scaleBy(after.gap / before.gap, after.x, after.y);
      setZoom((z) => panPhoto(z, after.x - before.x, after.y - before.y, frame()));
    };
    const onPointerEnd = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) setDragging(false);
    };

    const onDoubleClick = (e: MouseEvent) => {
      if ((e.target as Element).closest("button, audio")) return;
      setZoom((z) =>
        z.scale > 1 ? PHOTO_ZOOM_REST : zoomPhotoAt(z, DOUBLE_CLICK_SCALE, pointIn(e.clientX, e.clientY), frame()),
      );
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", onGestureStart);
    el.addEventListener("gesturechange", onGestureChange);
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerEnd);
    el.addEventListener("pointercancel", onPointerEnd);
    el.addEventListener("dblclick", onDoubleClick);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", onGestureStart);
      el.removeEventListener("gesturechange", onGestureChange);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerEnd);
      el.removeEventListener("pointercancel", onPointerEnd);
      el.removeEventListener("dblclick", onDoubleClick);
    };
  }, [enabled]);

  return { frameRef, zoom, zoomed: zoom.scale > 1, dragging, reset };
}
