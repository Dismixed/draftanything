import { describe, expect, it } from "vitest";
import { PHOTO_ZOOM_MAX, PHOTO_ZOOM_REST, panPhoto, zoomPhotoAt } from "@/lib/anyguessr/photo-zoom";

const frame = { width: 400, height: 300 };

describe("clue photo zoom", () => {
  it("keeps the spot under the pointer still while zooming", () => {
    const point = { x: 300, y: 60 };
    const zoomed = zoomPhotoAt(PHOTO_ZOOM_REST, 2, point, frame);
    // The photo spot that was under the pointer before is still under it after.
    expect((point.x - zoomed.x) / zoomed.scale).toBeCloseTo(300);
    expect((point.y - zoomed.y) / zoomed.scale).toBeCloseTo(60);
  });

  it("stops at the largest zoom and never shrinks below the frame", () => {
    expect(zoomPhotoAt(PHOTO_ZOOM_REST, 99, { x: 0, y: 0 }, frame).scale).toBe(PHOTO_ZOOM_MAX);
    expect(zoomPhotoAt({ scale: 2, x: -100, y: -50 }, 0.2, { x: 200, y: 150 }, frame)).toEqual(PHOTO_ZOOM_REST);
  });

  it("cannot be dragged far enough to leave a gap", () => {
    const zoomed = zoomPhotoAt(PHOTO_ZOOM_REST, 2, { x: 200, y: 150 }, frame);
    expect(panPhoto(zoomed, 5000, 5000, frame)).toEqual({ scale: 2, x: 0, y: 0 });
    expect(panPhoto(zoomed, -5000, -5000, frame)).toEqual({ scale: 2, x: -400, y: -300 });
  });

  it("does not move a photo that is not zoomed", () => {
    expect(panPhoto(PHOTO_ZOOM_REST, 40, 40, frame)).toBe(PHOTO_ZOOM_REST);
  });
});
