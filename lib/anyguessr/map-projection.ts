export interface GeoBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** Equirectangular projection for a full-world map (width × height). */
export function projectLatLng(
  lat: number,
  lng: number,
  width: number,
  height: number,
): { x: number; y: number } {
  return {
    x: ((lng + 180) / 360) * width,
    y: ((90 - lat) / 180) * height,
  };
}

const MIN_SPAN_DEG = 14;

/** Bounding box that fits answer + guess with a minimum span so the map never collapses. */
export function boundsForPoints(
  answer: { lat: number; lng: number },
  guess: { lat: number; lng: number } | null,
): GeoBounds {
  const points = guess ? [answer, guess] : [answer];
  const minLat = Math.min(...points.map((p) => p.lat));
  const maxLat = Math.max(...points.map((p) => p.lat));
  const minLng = Math.min(...points.map((p) => p.lng));
  const maxLng = Math.max(...points.map((p) => p.lng));

  const latSpan = Math.max(maxLat - minLat, MIN_SPAN_DEG);
  const lngSpan = Math.max(maxLng - minLng, MIN_SPAN_DEG);
  const latMid = (minLat + maxLat) / 2;
  const lngMid = (minLng + maxLng) / 2;

  return {
    minLat: latMid - latSpan / 2,
    maxLat: latMid + latSpan / 2,
    minLng: lngMid - lngSpan / 2,
    maxLng: lngMid + lngSpan / 2,
  };
}

export function projectToBounds(
  lat: number,
  lng: number,
  bounds: GeoBounds,
  width: number,
  height: number,
  padding = 0.12,
): { x: number; y: number } {
  const latSpan = bounds.maxLat - bounds.minLat || MIN_SPAN_DEG;
  const lngSpan = bounds.maxLng - bounds.minLng || MIN_SPAN_DEG;
  const padLat = latSpan * padding;
  const padLng = lngSpan * padding;
  const minLat = bounds.minLat - padLat;
  const maxLat = bounds.maxLat + padLat;
  const minLng = bounds.minLng - padLng;
  const maxLng = bounds.maxLng + padLng;

  return {
    x: ((lng - minLng) / (maxLng - minLng)) * width,
    y: ((maxLat - lat) / (maxLat - minLat)) * height,
  };
}

export function isValidLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** SVG viewBox string zoomed to geographic bounds on an equirectangular map. */
export function equirectangularViewBox(
  bounds: GeoBounds,
  mapWidth: number,
  mapHeight: number,
  padding = 0.18,
): string {
  const latSpan = bounds.maxLat - bounds.minLat || MIN_SPAN_DEG;
  const lngSpan = bounds.maxLng - bounds.minLng || MIN_SPAN_DEG;
  const padLat = latSpan * padding;
  const padLng = lngSpan * padding;
  const minLat = Math.max(-90, bounds.minLat - padLat);
  const maxLat = Math.min(90, bounds.maxLat + padLat);
  const minLng = Math.max(-180, bounds.minLng - padLng);
  const maxLng = Math.min(180, bounds.maxLng + padLng);

  const x = ((minLng + 180) / 360) * mapWidth;
  const y = ((90 - maxLat) / 180) * mapHeight;
  const w = ((maxLng - minLng) / 360) * mapWidth;
  const h = ((maxLat - minLat) / 180) * mapHeight;

  return `${x} ${y} ${w} ${h}`;
}
