import { looseEqual, normalizeAnswer } from "./normalize";
import countries from "./country-geo-data.json";

export interface CountryGeoEntry {
  cca3: string;
  cca2: string;
  name: string;
  latlng: [number, number];
  alt: string[];
}

const COUNTRY_GEO = countries as CountryGeoEntry[];

const byCca3 = new Map(COUNTRY_GEO.map((c) => [c.cca3, c]));
const byCca2 = new Map(COUNTRY_GEO.map((c) => [c.cca2, c]));

export function resolveGuessToCca3(guess: string): string | null {
  for (const c of COUNTRY_GEO) {
    if (looseEqual(guess, c.name)) return c.cca3;
    if (looseEqual(guess, c.cca2)) return c.cca3;
    for (const alt of c.alt) {
      if (looseEqual(guess, alt)) return c.cca3;
    }
  }
  const normalized = normalizeAnswer(guess);
  return (
    COUNTRY_GEO.find((c) => normalizeAnswer(c.name) === normalized)?.cca3 ?? null
  );
}

export function getLatLngForCca3(cca3: string): [number, number] | null {
  return byCca3.get(cca3)?.latlng ?? null;
}

export function getLatLngForIso2(iso2: string): [number, number] | null {
  return byCca2.get(iso2.toUpperCase())?.latlng ?? null;
}

/** Great-circle distance in kilometres between two lat/lng pairs. */
export function haversineKm(
  a: [number, number],
  b: [number, number],
): number {
  const [lat1, lng1] = a;
  const [lat2, lng2] = b;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinLng * sinLng;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function distanceBetweenCountriesKm(
  guessCca3: string,
  answerCca3: string,
): number {
  if (guessCca3 === answerCca3) return 0;
  const guessCoords = getLatLngForCca3(guessCca3);
  const answerCoords = getLatLngForCca3(answerCca3);
  if (!guessCoords || !answerCoords) return 20_000;
  return haversineKm(guessCoords, answerCoords);
}
