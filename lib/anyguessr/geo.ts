import "server-only";

import { looseEqual, normalizeAnswer } from "./normalize";

const REST_COUNTRIES_GEO_URL =
  "https://restcountries.com/v3.1/all?fields=cca3,cca2,name,latlng,altSpellings";

interface CountryGeo {
  cca3: string;
  cca2: string;
  name: string;
  latlng: [number, number];
  altSpellings: string[];
}

let geoCache: CountryGeo[] | null = null;

async function fetchCountryGeo(): Promise<CountryGeo[]> {
  if (geoCache) return geoCache;
  try {
    const res = await fetch(REST_COUNTRIES_GEO_URL, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86_400 },
    });
    if (!res.ok) throw new Error(`REST Countries ${res.status}`);
    const data = (await res.json()) as Array<{
      cca3: string;
      cca2: string;
      name: { common: string; official: string };
      latlng?: [number, number];
      altSpellings?: string[];
    }>;
    geoCache = data
      .filter((c) => Array.isArray(c.latlng) && c.latlng.length === 2)
      .map((c) => ({
        cca3: c.cca3,
        cca2: c.cca2,
        name: c.name.common,
        latlng: c.latlng as [number, number],
        altSpellings: c.altSpellings ?? [],
      }));
  } catch {
    geoCache = [];
  }
  return geoCache;
}

export async function resolveGuessToCca3(guess: string): Promise<string | null> {
  const countries = await fetchCountryGeo();
  for (const c of countries) {
    if (looseEqual(guess, c.name)) return c.cca3;
    if (looseEqual(guess, c.cca2)) return c.cca3;
    for (const alt of c.altSpellings) {
      if (looseEqual(guess, alt)) return c.cca3;
    }
  }
  const normalized = normalizeAnswer(guess);
  return countries.find((c) => normalizeAnswer(c.name) === normalized)?.cca3 ?? null;
}

export async function getLatLngForCca3(cca3: string): Promise<[number, number] | null> {
  const countries = await fetchCountryGeo();
  const hit = countries.find((c) => c.cca3 === cca3);
  return hit?.latlng ?? null;
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

export async function distanceBetweenCountriesKm(
  guessCca3: string,
  answerCca3: string,
): Promise<number> {
  if (guessCca3 === answerCca3) return 0;
  const [guessCoords, answerCoords] = await Promise.all([
    getLatLngForCca3(guessCca3),
    getLatLngForCca3(answerCca3),
  ]);
  if (!guessCoords || !answerCoords) return 20_000;
  return haversineKm(guessCoords, answerCoords);
}
