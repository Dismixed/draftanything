// Builds public/anyguessr/world-countries-50m.geojson from Natural Earth's 50m countries file
// (https://github.com/nvkelso/natural-earth-vector, geojson/ne_50m_admin_0_countries.geojson).
//
//   node scripts/build-anyguessr-world.mjs <path to ne_50m_admin_0_countries.geojson>
//
// Keeps only the properties the game reads, rounds coordinates, and moves the slivers of
// Russia and Fiji that lie past the date line next to the rest of the country, so neither is
// cut in two with a straight edge.

import { readFileSync, writeFileSync } from "node:fs";

const KEEP = ["ISO_A3", "ISO_A3_EH", "ADM0_A3", "NAME"];
const CROSSES_DATE_LINE = new Set(["RUS", "FJI"]);
const OUT = "public/anyguessr/world-countries-50m.geojson";

const source = process.argv[2];
if (!source) throw new Error("Pass the path to ne_50m_admin_0_countries.geojson");
const world = JSON.parse(readFileSync(source, "utf8"));

// Natural Earth leaves some date-line corners a hair short of 180.
const onSeam = (p) => Math.abs(Math.abs(p[0]) - 180) < 1e-3;
const same = (a, b) => Math.abs(a[0] - b[0]) < 1e-3 && Math.abs(a[1] - b[1]) < 1e-3;

/** Indexes of the first and last corner of a ring's run along the date line, if it has one. */
function seamRun(ring) {
  const open = ring.slice(0, -1);
  const at = open.map((p, i) => (onSeam(p) && onSeam(open[(i + 1) % open.length]) ? i : -1)).filter((i) => i >= 0);
  if (at.length === 0) return null;
  return { start: at[0], end: at[at.length - 1] + 1 };
}

/** Joins two outer rings that meet along the date line into one, dropping the shared edge. */
function joinAtSeam(a, b) {
  const runA = seamRun(a);
  const runB = seamRun(b);
  if (!runA || !runB) return null;
  const openB = b.slice(0, -1);
  if (!same(a[runA.start], openB[runB.end % openB.length]) || !same(a[runA.end], openB[runB.start])) return null;
  const around = [];
  for (let i = runB.end + 1; i % openB.length !== runB.start; i++) around.push(openB[i % openB.length]);
  return [...a.slice(0, runA.start + 1), ...around, ...a.slice(runA.end)];
}

function unsplit(polygons) {
  const shifted = polygons.map((poly) =>
    poly[0].every((p) => p[0] <= 0) ? poly.map((ring) => ring.map(([x, y]) => [x + 360, y])) : poly,
  );
  for (let i = 0; i < shifted.length; i++) {
    for (let j = 0; j < shifted.length; j++) {
      if (i === j || !shifted[i] || !shifted[j]) continue;
      const joined = joinAtSeam(shifted[i][0], shifted[j][0]);
      if (!joined) continue;
      shifted[i] = [joined, ...shifted[i].slice(1), ...shifted[j].slice(1)];
      shifted[j] = null;
    }
  }
  return shifted.filter(Boolean);
}

const round = (n) => Math.round(n * 1000) / 1000;

function tidyRing(ring) {
  const out = [];
  for (const [x, y] of ring) {
    const p = [round(x), round(y)];
    if (out.length === 0 || out[out.length - 1][0] !== p[0] || out[out.length - 1][1] !== p[1]) out.push(p);
  }
  return out.length >= 4 ? out : null;
}

const features = world.features.map((feature) => {
  const { geometry } = feature;
  let polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  if (CROSSES_DATE_LINE.has(feature.properties.ADM0_A3)) polygons = unsplit(polygons);
  polygons = polygons
    .map((poly) => poly.map(tidyRing))
    .filter((poly) => poly[0])
    .map((poly) => poly.filter(Boolean));
  return {
    type: "Feature",
    properties: Object.fromEntries(KEEP.map((key) => [key, feature.properties[key]])),
    geometry: { type: "MultiPolygon", coordinates: polygons },
  };
});

writeFileSync(OUT, JSON.stringify({ type: "FeatureCollection", features }));
console.log(`${OUT}: ${features.length} countries`);
